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
  if (data.version !== 2 && data.version !== 3 || data.mode !== "external") return state;
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
  stateVersion: 2
};

// src/host/run-logs.ts
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
var RunLogError = class extends Error {
  code;
  /**
   * @param code - stable failure code.
   * @param message - user-facing explanation without file contents.
   */
  constructor(code, message) {
    super(message);
    this.name = "RunLogError";
    this.code = code;
  }
};
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var MAX_READ_BYTES = 512 * 1024;
function isRunLogId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
function isRunLogSource(value) {
  return value === "dsh" || value === "native";
}
function resolveRunLogDir() {
  const configured = process.env.DSH_HOME?.trim();
  const home = configured !== void 0 && configured.length > 0 ? configured : join(homedir(), ".dsh");
  return join(home, "logs", "subagent-claude-code");
}
async function readRunLog(childId, source = "dsh", offset = 0) {
  if (!isRunLogId(childId)) {
    throw new RunLogError("invalid-request", "childId must be a lowercase UUID.");
  }
  if (!isRunLogSource(source)) {
    throw new RunLogError("invalid-request", 'source must be "dsh" or "native".');
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RunLogError("invalid-request", "offset must be a non-negative integer.");
  }
  const directory = resolveRunLogDir();
  if (source === "dsh") {
    const file2 = containedPath(directory, `${childId}.jsonl`);
    return readLines(file2, offset, () => new RunLogError(
      "log-not-found",
      "No DSH log was found for this task."
    ));
  }
  const file = await resolveNativeTranscript(directory, childId);
  return readLines(file, offset, () => transcriptNotFound());
}
async function readLines(file, offset, notFound) {
  let handle;
  try {
    handle = await fs.open(file, "r");
  } catch (error) {
    if (isErrno(error, "ENOENT")) throw notFound();
    throw new RunLogError("read-failed", "The log file could not be opened.");
  }
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw notFound();
    const size = stat.size;
    const start = offset > size ? size : offset;
    if (start >= size) return { content: "", nextOffset: size };
    const length = Math.min(MAX_READ_BYTES, size - start);
    const buffer = Buffer.allocUnsafe(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    if (bytesRead === 0) return { content: "", nextOffset: start };
    const lastNewline = buffer.lastIndexOf(10, bytesRead - 1);
    if (lastNewline < 0) {
      return { content: "", nextOffset: start };
    }
    return {
      content: buffer.subarray(0, lastNewline + 1).toString("utf8"),
      nextOffset: start + lastNewline + 1
    };
  } catch (error) {
    if (error instanceof RunLogError) throw error;
    throw new RunLogError("read-failed", "The log file could not be read.");
  } finally {
    await handle.close().catch(() => {
    });
  }
}
async function resolveNativeTranscript(directory, childId) {
  const metaPath = containedPath(directory, `${childId}.meta.json`);
  let raw;
  try {
    raw = await fs.readFile(metaPath, "utf8");
  } catch (error) {
    if (isErrno(error, "ENOENT")) throw transcriptNotFound();
    throw new RunLogError("read-failed", "The run metadata could not be read.");
  }
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch {
    throw transcriptNotFound();
  }
  if (!isRecord2(meta)) throw transcriptNotFound();
  const sessionId = meta.claudeSessionId;
  const configDir = meta.claudeConfigDir;
  if (typeof sessionId !== "string" || sessionId.length === 0) throw transcriptNotFound();
  if (/[/\\\0]/.test(sessionId)) throw transcriptNotFound();
  if (typeof configDir !== "string" || configDir.length === 0) throw transcriptNotFound();
  const projectsDir = resolve(configDir, "projects");
  let projectNames;
  try {
    projectNames = await fs.readdir(projectsDir);
  } catch (error) {
    if (isErrno(error, "ENOENT") || isErrno(error, "ENOTDIR")) throw transcriptNotFound();
    throw new RunLogError("read-failed", "The Claude projects directory could not be read.");
  }
  projectNames.sort();
  for (const projectName of projectNames) {
    const candidate = resolve(projectsDir, projectName, `${sessionId}.jsonl`);
    if (!isWithin(projectsDir, candidate)) continue;
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch (error) {
      if (isErrno(error, "ENOENT") || isErrno(error, "ENOTDIR")) continue;
      throw new RunLogError("read-failed", "The Claude transcript could not be inspected.");
    }
  }
  throw transcriptNotFound();
}
function transcriptNotFound() {
  return new RunLogError(
    "transcript-not-found",
    "No native Claude transcript was found for this task."
  );
}
function containedPath(root, name2) {
  const base = resolve(root);
  const candidate = resolve(base, name2);
  if (!isWithin(base, candidate)) {
    throw new RunLogError("invalid-request", "The requested path is outside the allowed directory.");
  }
  return candidate;
}
function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path.length === 0 || path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isErrno(error, code) {
  return typeof error === "object" && error !== null && error.code === code;
}

// src/index.ts
var name = "dsh-external-task-context";
var inject = ["sessionProjections", "connection"];
var LOG_PATH = "/api/external-task-context/log";
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function errorResponse(status, code, message) {
  return jsonResponse(status, { ok: false, error: { code, message } });
}
function statusOf(code) {
  switch (code) {
    case "invalid-request":
      return 400;
    case "log-not-found":
      return 404;
    case "transcript-not-found":
      return 404;
    case "read-failed":
      return 500;
    default:
      return 500;
  }
}
function parseQuery(url) {
  const childId = url.searchParams.get("childId");
  if (childId === null || !isRunLogId(childId)) {
    return {
      ok: false,
      response: errorResponse(400, "invalid-request", "childId must be a lowercase UUID.")
    };
  }
  const source = url.searchParams.get("source") ?? "dsh";
  if (!isRunLogSource(source)) {
    return {
      ok: false,
      response: errorResponse(400, "invalid-request", 'source must be "dsh" or "native".')
    };
  }
  const rawOffset = url.searchParams.get("offset") ?? "0";
  if (!/^\d+$/.test(rawOffset)) {
    return {
      ok: false,
      response: errorResponse(400, "invalid-request", "offset must be a non-negative integer.")
    };
  }
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset)) {
    return {
      ok: false,
      response: errorResponse(400, "invalid-request", "offset must be a non-negative integer.")
    };
  }
  return { ok: true, childId, source, offset };
}
async function handleLog(request) {
  try {
    const query = parseQuery(new URL(request.url));
    if (!query.ok) return query.response;
    try {
      const value = await readRunLog(query.childId, query.source, query.offset);
      return jsonResponse(200, { ok: true, value });
    } catch (cause) {
      if (cause instanceof RunLogError) {
        return errorResponse(statusOf(cause.code), cause.code, cause.message);
      }
      return errorResponse(500, "read-failed", "The log could not be read.");
    }
  } catch {
    return errorResponse(500, "read-failed", "The log request failed.");
  }
}
async function apply(ctx) {
  await ctx.sessionProjections.register(externalTaskContextProjection);
  ctx.effect(() => ctx.connection.fetch.register({
    path: LOG_PATH,
    methods: ["GET"],
    requestBody: "buffered",
    fetch: handleLog
  }), "external-task-context: run-log route");
}
export {
  apply,
  inject,
  name
};
