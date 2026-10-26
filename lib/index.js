// src/shared/projection.ts
var EXTERNAL_TASK_CONTEXTS = "externalTaskContexts";

// src/host/settlement.ts
var NO_CLOSING_MESSAGE = "It left no closing message.";
function statusFromSettlementSummary(summary) {
  if (summary.includes("was stopped")) return "aborted";
  if (summary.includes("ran out of room")) return "max-tokens";
  if (summary.includes("declined the task")) return "refusal";
  if (summary.includes("failed before it finished")) return "error";
  if (summary.includes("ended abnormally")) return "unknown";
  if (summary.includes("finished")) return "completed";
  return "unknown";
}
function answerFromSettlementContent(content) {
  const texts = [];
  for (const block of content) {
    if (block.type === "text") texts.push(block.text);
  }
  if (texts.length === 0) return {};
  const summary = texts[0];
  if (texts[1] === NO_CLOSING_MESSAGE) return { summary };
  const answer = texts.slice(2).join("\n\n");
  return answer.length === 0 ? { summary } : { summary, answer };
}

// src/host/text.ts
var MAX_CONTEXT_TEXT_BYTES = 64 * 1024;
var encoder = new TextEncoder();
var decoder = new TextDecoder();
function boundText(text) {
  const bytes = encoder.encode(text);
  if (bytes.byteLength <= MAX_CONTEXT_TEXT_BYTES) return { text, truncated: false };
  let prefixBytes = MAX_CONTEXT_TEXT_BYTES;
  while (prefixBytes > 0 && (bytes[prefixBytes] & 192) === 128) {
    prefixBytes -= 1;
  }
  return { text: decoder.decode(bytes.subarray(0, prefixBytes)), truncated: true };
}

// src/host/projection.ts
var MAX_PENDING_DELEGATIONS = 20;
var STATE_LABEL = "externalTaskContexts";
var VIEW_LABEL = "externalTaskContexts view";
var STATUS_VALUES = /* @__PURE__ */ new Set([
  "pending",
  "completed",
  "aborted",
  "max-tokens",
  "refusal",
  "error",
  "unknown"
]);
function initialState(inheritedEventCount) {
  return { inheritedEventCount, tasks: [], pending: [] };
}
function applyExternalTaskEvent(state, event) {
  if (event.seq < state.inheritedEventCount) return state;
  switch (event.type) {
    case "tool/call":
      return foldToolCall(state, event);
    case "subagent/catalog":
      return foldCatalog(state, event);
    case "user/message":
      return foldSettlement(state, event);
    default:
      return state;
  }
}
function viewExternalTaskContexts(state) {
  return state.tasks;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function readOptions(record) {
  const provider = nonEmptyString(record, "provider");
  const model = nonEmptyString(record, "model");
  const reasoningEffort = nonEmptyString(record, "reasoning_effort");
  const agentPreset = nonEmptyString(record, "agent_preset");
  if (provider === void 0 && model === void 0 && reasoningEffort === void 0 && agentPreset === void 0) {
    return void 0;
  }
  return {
    ...provider !== void 0 ? { provider } : {},
    ...model !== void 0 ? { model } : {},
    ...reasoningEffort !== void 0 ? { reasoningEffort } : {},
    ...agentPreset !== void 0 ? { agentPreset } : {}
  };
}
function foldToolCall(state, event) {
  let parsed;
  try {
    parsed = JSON.parse(event.data.arguments);
  } catch {
    return state;
  }
  if (!isRecord(parsed)) return state;
  const label = nonEmptyString(parsed, "description");
  const prompt = nonEmptyString(parsed, "prompt");
  if (label === void 0 || prompt === void 0) return state;
  const bounded = boundText(prompt);
  const cwd = nonEmptyString(parsed, "cwd");
  const options = readOptions(parsed);
  const pending = {
    callId: event.data.callId,
    tool: event.data.name,
    time: event.time,
    label,
    prompt: bounded.text,
    ...bounded.truncated ? { promptTruncated: true } : {},
    ...cwd !== void 0 ? { cwd } : {},
    ...options !== void 0 ? { options } : {}
  };
  return {
    ...state,
    pending: [...state.pending, pending].slice(-MAX_PENDING_DELEGATIONS)
  };
}
function takePending(pending, label) {
  if (label !== void 0) {
    const labelled = pending.find((entry) => entry.label === label);
    if (labelled !== void 0) return labelled;
  }
  return pending.length === 1 ? pending[0] : void 0;
}
function foldCatalog(state, event) {
  const data = event.data;
  if (data.version !== 2 || data.mode !== "external") return state;
  if (state.tasks.some((task2) => task2.id === data.childId)) return state;
  const pending = takePending(state.pending, data.label);
  const task = {
    id: data.childId,
    createdAt: data.childCreatedAt,
    status: "pending",
    ...data.label !== void 0 ? { label: data.label } : {},
    ...pending === void 0 ? {} : {
      tool: pending.tool,
      ...pending.prompt !== void 0 ? { prompt: pending.prompt } : {},
      ...pending.promptTruncated === true ? { promptTruncated: true } : {},
      ...pending.cwd !== void 0 ? { cwd: pending.cwd } : {},
      ...pending.options !== void 0 ? { options: pending.options } : {}
    }
  };
  return {
    ...state,
    tasks: [...state.tasks, task],
    pending: pending === void 0 ? state.pending : state.pending.filter((entry) => entry !== pending)
  };
}
function foldSettlement(state, event) {
  const source = event.data.source;
  if (source.kind !== "subagent-settled") return state;
  const childId = source.senderSessionId;
  if (!state.tasks.some((task) => task.id === childId)) return state;
  const sourceSummary = typeof source.summary === "string" ? source.summary : "";
  const extracted = answerFromSettlementContent(event.data.content);
  const rawSummary = sourceSummary.length > 0 ? sourceSummary : extracted.summary;
  const summary = rawSummary !== void 0 && rawSummary.length > 0 ? boundText(rawSummary) : void 0;
  const answer = extracted.answer !== void 0 && extracted.answer.length > 0 ? boundText(extracted.answer) : void 0;
  const status = statusFromSettlementSummary(sourceSummary);
  return {
    ...state,
    tasks: state.tasks.map((task) => {
      if (task.id !== childId) return task;
      return {
        id: task.id,
        createdAt: task.createdAt,
        status,
        completedAt: event.time,
        ...task.label !== void 0 ? { label: task.label } : {},
        ...task.tool !== void 0 ? { tool: task.tool } : {},
        ...task.prompt !== void 0 ? { prompt: task.prompt } : {},
        ...task.promptTruncated !== void 0 ? { promptTruncated: task.promptTruncated } : {},
        ...task.cwd !== void 0 ? { cwd: task.cwd } : {},
        ...task.options !== void 0 ? { options: task.options } : {},
        ...summary !== void 0 ? { summary: summary.text } : {},
        ...answer !== void 0 ? { answer: answer.text, ...answer.truncated ? { answerTruncated: true } : {} } : {}
      };
    })
  };
}
function expectRecord(value, field) {
  if (!isRecord(value)) throw new TypeError(`${STATE_LABEL}: ${field} must be an object`);
  return value;
}
function expectString(record, field, key) {
  const value = record[key];
  if (typeof value !== "string") throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a string`);
  return value;
}
function optionalString(record, field, key) {
  const value = record[key];
  if (value === void 0) return void 0;
  if (typeof value !== "string") throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a string`);
  return value;
}
function optionalBoolean(record, field, key) {
  const value = record[key];
  if (value === void 0) return void 0;
  if (typeof value !== "boolean") throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a boolean`);
  return value;
}
function expectNumber(record, field, key) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a finite number`);
  }
  return value;
}
function optionalNumber(record, field, key) {
  const value = record[key];
  if (value === void 0) return void 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a finite number`);
  }
  return value;
}
function parseStatus(value, field) {
  if (typeof value !== "string" || !STATUS_VALUES.has(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field} is not a known status`);
  }
  return value;
}
function parseOptions(value, field) {
  if (value === void 0) return void 0;
  const record = expectRecord(value, `${field}.options`);
  const provider = optionalString(record, `${field}.options`, "provider");
  const model = optionalString(record, `${field}.options`, "model");
  const reasoningEffort = optionalString(record, `${field}.options`, "reasoningEffort");
  const agentPreset = optionalString(record, `${field}.options`, "agentPreset");
  return {
    ...provider !== void 0 ? { provider } : {},
    ...model !== void 0 ? { model } : {},
    ...reasoningEffort !== void 0 ? { reasoningEffort } : {},
    ...agentPreset !== void 0 ? { agentPreset } : {}
  };
}
function parseTask(value, field) {
  const record = expectRecord(value, field);
  const label = optionalString(record, field, "label");
  const tool = optionalString(record, field, "tool");
  const prompt = optionalString(record, field, "prompt");
  const promptTruncated = optionalBoolean(record, field, "promptTruncated");
  const cwd = optionalString(record, field, "cwd");
  const summary = optionalString(record, field, "summary");
  const answer = optionalString(record, field, "answer");
  const answerTruncated = optionalBoolean(record, field, "answerTruncated");
  const completedAt = optionalNumber(record, field, "completedAt");
  return {
    id: expectString(record, field, "id"),
    createdAt: expectNumber(record, field, "createdAt"),
    status: parseStatus(record.status, `${field}.status`),
    ...label !== void 0 ? { label } : {},
    ...tool !== void 0 ? { tool } : {},
    ...prompt !== void 0 ? { prompt } : {},
    ...promptTruncated !== void 0 ? { promptTruncated } : {},
    ...cwd !== void 0 ? { cwd } : {},
    ...record.options !== void 0 ? { options: parseOptions(record.options, field) } : {},
    ...summary !== void 0 ? { summary } : {},
    ...answer !== void 0 ? { answer } : {},
    ...answerTruncated !== void 0 ? { answerTruncated } : {},
    ...completedAt !== void 0 ? { completedAt } : {}
  };
}
function parsePending(value, field) {
  const record = expectRecord(value, field);
  const label = optionalString(record, field, "label");
  const prompt = optionalString(record, field, "prompt");
  const promptTruncated = optionalBoolean(record, field, "promptTruncated");
  const cwd = optionalString(record, field, "cwd");
  return {
    callId: expectString(record, field, "callId"),
    tool: expectString(record, field, "tool"),
    time: expectNumber(record, field, "time"),
    ...label !== void 0 ? { label } : {},
    ...prompt !== void 0 ? { prompt } : {},
    ...promptTruncated !== void 0 ? { promptTruncated } : {},
    ...cwd !== void 0 ? { cwd } : {},
    ...record.options !== void 0 ? { options: parseOptions(record.options, field) } : {}
  };
}
var stateSchema = {
  parse(value) {
    const record = expectRecord(value, "state");
    const inheritedEventCount = record.inheritedEventCount;
    if (typeof inheritedEventCount !== "number" || !Number.isInteger(inheritedEventCount) || inheritedEventCount < 0) {
      throw new TypeError(`${STATE_LABEL}: inheritedEventCount must be a non-negative integer`);
    }
    const tasks = record.tasks;
    if (!Array.isArray(tasks)) throw new TypeError(`${STATE_LABEL}: tasks must be an array`);
    const pending = record.pending;
    if (!Array.isArray(pending)) throw new TypeError(`${STATE_LABEL}: pending must be an array`);
    return {
      inheritedEventCount,
      tasks: tasks.map((item, index) => parseTask(item, `tasks[${index}]`)),
      pending: pending.map((item, index) => parsePending(item, `pending[${index}]`))
    };
  }
};
var viewSchema = {
  parse(value) {
    if (!Array.isArray(value)) throw new TypeError(`${VIEW_LABEL}: expected an array`);
    value.forEach((item, index) => {
      parseTask(item, `tasks[${index}]`);
    });
    return value;
  }
};
var externalTaskContextProjection = {
  key: EXTERNAL_TASK_CONTEXTS,
  stateSchema,
  init: (_header, inheritedEventCount) => initialState(inheritedEventCount),
  apply: applyExternalTaskEvent,
  wire: {
    viewSchema,
    view: viewExternalTaskContexts
  },
  stateVersion: 1
};

// src/index.ts
var name = "dsh-external-task-context";
var inject = ["sessionProjections"];
async function apply(ctx) {
  await ctx.sessionProjections.register(externalTaskContextProjection);
}
export {
  apply,
  inject,
  name
};
