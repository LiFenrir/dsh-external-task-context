window.__ModuleLoader__.load({
  id: "@lifenrir/dsh-external-task-context",
  factory: (require) => {
    var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/page.tsx
var import_react3 = require("react");

// src/shared/projection.ts
var EXTERNAL_TASK_CONTEXTS = "externalTaskContexts";

// src/client/locales.ts
var NS = "externalTaskContext";
var zh = {
  "view.label": "\u5916\u90E8\u4EFB\u52A1",
  "view.mode.conversation": "\u5BF9\u8BDD",
  "view.mode.stats": "\u7EDF\u8BA1",
  "page.empty": "\u5F53\u524D\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u5916\u90E8\u4EFB\u52A1\u8BB0\u5F55\u3002",
  "page.unavailable": "\u6295\u5F71\u4E0D\u53EF\u7528",
  "page.unavailableHint": "\u8BF7\u786E\u8BA4\u5916\u90E8\u4EFB\u52A1\u4E0A\u4E0B\u6587\u63D2\u4EF6\u5DF2\u5728\u5F53\u524D\u914D\u7F6E\u4E2D\u542F\u7528\uFF0C\u7136\u540E\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u3002",
  "page.taskSelectAria": "\u9009\u62E9\u5916\u90E8\u4EFB\u52A1",
  "page.unsupported": "\u5F53\u524D\u5DE5\u5177\u4E0D\u652F\u6301\u8FD0\u884C\u65E5\u5FD7\u4E0E\u7EDF\u8BA1\u67E5\u770B\u3002",
  "conversation.result": "\u8FD4\u56DE\u7ED3\u679C",
  "conversation.emptyResult": "\u4EFB\u52A1\u5DF2\u7ED3\u675F\uFF0C\u4F46\u6CA1\u6709\u8FD4\u56DE\u6587\u672C\u7ED3\u679C\u3002",
  "stats.status": "\u72B6\u6001",
  "stats.duration": "\u8017\u65F6",
  "stats.messages": "\u6D88\u606F\u6570",
  "stats.toolCalls": "\u5DE5\u5177\u8C03\u7528",
  "stats.toolResults": "\u5DE5\u5177\u7ED3\u679C",
  "stats.inputTokens": "\u8F93\u5165 token",
  "stats.outputTokens": "\u8F93\u51FA token",
  "stats.cost": "\u6210\u672C",
  "stats.unavailable": "\u65E0\u6CD5\u8BFB\u53D6\u8FD0\u884C\u65E5\u5FD7\uFF0C\u7EDF\u8BA1\u6570\u636E\u4E0D\u53EF\u7528\u3002",
  "stats.notAvailable": "\u6682\u65E0",
  "detail.createdAt": "\u5F00\u59CB\u65F6\u95F4",
  "detail.completedAt": "\u5B8C\u6210\u65F6\u95F4",
  "detail.promptMissing": "\u672A\u8BB0\u5F55\u59D4\u6D3E\u63D0\u793A\u8BCD\u3002",
  "detail.provider": "\u63D0\u4F9B\u65B9",
  "detail.model": "\u6A21\u578B",
  "detail.reasoning": "\u63A8\u7406\u5F3A\u5EA6",
  "detail.preset": "Agent \u9884\u8BBE",
  "detail.truncated": "\u5185\u5BB9\u8FC7\u957F\uFF0C\u5DF2\u622A\u65AD\u663E\u793A\u3002",
  "tool.thinking": "\u601D\u8003",
  "tool.result": "\u2190 \u7ED3\u679C",
  "fileChange.title": "\u6587\u4EF6\u53D8\u66F4",
  "fileChange.truncated": "\u53D8\u66F4\u8FC7\u957F\uFF0C\u4EC5\u663E\u793A\u9996\u5C3E\u90E8\u5206\u3002",
  "log.empty": "\u65E5\u5FD7\u6682\u65E0\u5185\u5BB9\u3002",
  "log.waiting": "\u7B49\u5F85\u65E5\u5FD7\u5199\u5165\u2026",
  "log.unavailable": "\u65E5\u5FD7\u4E0D\u53EF\u7528\uFF08\u4EFB\u52A1\u53EF\u80FD\u4E0D\u662F Claude Code\uFF0C\u6216\u65E5\u5FD7\u5C1A\u672A\u751F\u6210\uFF09\u3002",
  "log.refresh": "\u5237\u65B0",
  "log.running": "\u8FD0\u884C\u4E2D",
  "markdown.copy": "\u590D\u5236",
  "markdown.copied": "\u5DF2\u590D\u5236",
  "markdown.footnotes": "\u811A\u6CE8",
  "markdown.truncated": "\u90E8\u5206\u5185\u5BB9\u8FC7\u957F\uFF0C\u5DF2\u622A\u65AD\u663E\u793A\u3002",
  "status.pending": "\u8FDB\u884C\u4E2D",
  "status.completed": "\u5DF2\u5B8C\u6210",
  "status.aborted": "\u5DF2\u4E2D\u6B62",
  "status.maxTokens": "\u8F93\u51FA\u8FBE\u5230\u4E0A\u9650",
  "status.refusal": "\u5DF2\u62D2\u7EDD\u4EFB\u52A1",
  "status.error": "\u5931\u8D25",
  "status.unknown": "\u672A\u77E5"
};
var en = {
  "view.label": "External tasks",
  "view.mode.conversation": "Conversation",
  "view.mode.stats": "Statistics",
  "page.empty": "This session has no external task records yet.",
  "page.unavailable": "Projection unavailable",
  "page.unavailableHint": "Confirm the external task context plugin is enabled in this profile, then reopen the session.",
  "page.taskSelectAria": "Select external task",
  "page.unsupported": "Run logs and statistics are not available for this tool.",
  "conversation.result": "Result",
  "conversation.emptyResult": "The task ended without a text result.",
  "stats.status": "Status",
  "stats.duration": "Duration",
  "stats.messages": "Messages",
  "stats.toolCalls": "Tool calls",
  "stats.toolResults": "Tool results",
  "stats.inputTokens": "Input tokens",
  "stats.outputTokens": "Output tokens",
  "stats.cost": "Cost",
  "stats.unavailable": "The run log could not be read, so statistics are unavailable.",
  "stats.notAvailable": "Not available",
  "detail.createdAt": "Started",
  "detail.completedAt": "Completed",
  "detail.promptMissing": "No delegation prompt was recorded.",
  "detail.provider": "Provider",
  "detail.model": "Model",
  "detail.reasoning": "Reasoning effort",
  "detail.preset": "Agent preset",
  "detail.truncated": "The content was too long and is truncated.",
  "tool.thinking": "Thinking",
  "tool.result": "\u2190 Result",
  "fileChange.title": "File change",
  "fileChange.truncated": "The change is too long; only its start and end are shown.",
  "log.empty": "No log content yet.",
  "log.waiting": "Waiting for log output\u2026",
  "log.unavailable": "Log unavailable (not a Claude Code task, or nothing written yet).",
  "log.refresh": "Refresh",
  "log.running": "Running",
  "markdown.copy": "Copy",
  "markdown.copied": "Copied",
  "markdown.footnotes": "Footnotes",
  "markdown.truncated": "Some content was too long and is truncated.",
  "status.pending": "Running",
  "status.completed": "Completed",
  "status.aborted": "Stopped",
  "status.maxTokens": "Token limit reached",
  "status.refusal": "Task declined",
  "status.error": "Failed",
  "status.unknown": "Unknown"
};

// src/client/page-utils.ts
function statusLabel(status, t) {
  switch (status) {
    case "pending":
      return t("status.pending");
    case "completed":
      return t("status.completed");
    case "aborted":
      return t("status.aborted");
    case "max-tokens":
      return t("status.maxTokens");
    case "refusal":
      return t("status.refusal");
    case "error":
      return t("status.error");
    case "unknown":
      return t("status.unknown");
    default:
      return t("status.unknown");
  }
}
function formatTime(milliseconds) {
  return new Date(milliseconds).toLocaleString();
}
function shortId(id) {
  return id.length > 12 ? `${id.slice(0, 12)}\u2026` : id;
}

// src/client/page-stats.tsx
var import_react = require("react");

// src/client/log-stats.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function numberOrZero(value) {
  return finiteNumber(value) ?? 0;
}
function sdkContent(message) {
  const nested = message.message;
  if (isRecord(nested) && "content" in nested) return nested.content;
  return message.content;
}
function countBlocks(content, type) {
  if (!Array.isArray(content)) return 0;
  let count = 0;
  for (const block2 of content) {
    if (isRecord(block2) && block2.type === type) count += 1;
  }
  return count;
}
function emptyAccumulator() {
  return {
    messages: 0,
    toolCalls: 0,
    toolResults: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: void 0,
    startedAt: void 0,
    endedAt: void 0
  };
}
function applyUsage(accumulator, usage) {
  if (!isRecord(usage)) return;
  accumulator.inputTokens = numberOrZero(usage.input_tokens);
  accumulator.outputTokens = numberOrZero(usage.output_tokens);
}
function trackTime(accumulator, time) {
  if (time === void 0) return;
  if (accumulator.startedAt === void 0) accumulator.startedAt = time;
  accumulator.endedAt = time;
}
function finalize(accumulator) {
  return {
    messages: accumulator.messages,
    toolCalls: accumulator.toolCalls,
    toolResults: accumulator.toolResults,
    inputTokens: accumulator.inputTokens,
    outputTokens: accumulator.outputTokens,
    ...accumulator.costUsd !== void 0 ? { costUsd: accumulator.costUsd } : {},
    ...accumulator.startedAt !== void 0 ? { startedAt: accumulator.startedAt } : {},
    ...accumulator.endedAt !== void 0 ? { endedAt: accumulator.endedAt } : {}
  };
}
function summarizeDshLog(text) {
  const accumulator = emptyAccumulator();
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length === 0) continue;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(entry)) continue;
    const time = finiteNumber(entry.time);
    trackTime(accumulator, time);
    if (entry.kind !== "message" || !isRecord(entry.message)) continue;
    const message = entry.message;
    if (message.type === "assistant") {
      accumulator.messages += 1;
      accumulator.toolCalls += countBlocks(sdkContent(message), "tool_use");
      const nested = message.message;
      applyUsage(accumulator, isRecord(nested) ? nested.usage : void 0);
    } else if (message.type === "user") {
      accumulator.toolResults += countBlocks(sdkContent(message), "tool_result");
    } else if (message.type === "result") {
      applyUsage(accumulator, message.usage);
      const cost = finiteNumber(message.total_cost_usd);
      if (cost !== void 0) accumulator.costUsd = cost;
    }
  }
  return finalize(accumulator);
}

// src/client/page-stats.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var POLL_INTERVAL_MS = 2e3;
var MAX_READS = 64;
var SHELL = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  width: "100%",
  padding: "14px 0 0",
  boxSizing: "border-box"
};
var TOOLBAR = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6
};
var RUNNING = {
  fontSize: 10,
  color: "var(--dsw-alias-label-secondary)"
};
var CHIP = {
  padding: "2px 8px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 999,
  background: "transparent",
  font: "inherit",
  fontSize: 11,
  lineHeight: "16px",
  color: "var(--dsw-alias-label-secondary)",
  cursor: "pointer"
};
var GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 10
};
var CARD = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
  padding: "10px 12px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 8,
  boxSizing: "border-box"
};
var CARD_LABEL = {
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var CARD_VALUE = {
  fontSize: 17,
  lineHeight: 1.35,
  color: "var(--dsw-alias-label-primary)",
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere"
};
var NOTICE = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "18px 0",
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 12
};
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function chunkOf(payload) {
  if (!isRecord2(payload) || payload.ok !== true || !isRecord2(payload.value)) return void 0;
  const content = payload.value.content;
  const nextOffset = payload.value.nextOffset;
  if (typeof content !== "string" || typeof nextOffset !== "number" || !Number.isSafeInteger(nextOffset) || nextOffset < 0) {
    return void 0;
  }
  return { content, nextOffset };
}
function taskDuration(task, stats) {
  if (task.completedAt !== void 0) {
    return Math.max(0, task.completedAt - task.createdAt);
  }
  if (stats?.startedAt !== void 0 && stats.endedAt !== void 0) {
    return Math.max(0, stats.endedAt - stats.startedAt);
  }
  return void 0;
}
function formatDuration(milliseconds) {
  if (milliseconds < 1e3) return `${milliseconds}ms`;
  const seconds = milliseconds / 1e3;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}
function StatsPane({ task, running, t }) {
  const [stats, setStats] = (0, import_react.useState)(void 0);
  const [state, setState] = (0, import_react.useState)("loading");
  const [refreshSeq, setRefreshSeq] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    let active = true;
    let timer;
    setState("loading");
    setStats(void 0);
    const tick = async () => {
      let offset = 0;
      let text = "";
      let readAny = false;
      let failed = false;
      for (let reads = 0; reads < MAX_READS; reads += 1) {
        try {
          const query = new URLSearchParams({
            childId: task.id,
            source: "dsh",
            offset: String(offset)
          });
          const response = await fetch(`/api/external-task-context/log?${query.toString()}`, {
            credentials: "same-origin",
            cache: "no-store"
          });
          if (!active) return;
          let payload;
          try {
            payload = await response.json();
          } catch {
            payload = void 0;
          }
          const chunk = response.ok ? chunkOf(payload) : void 0;
          if (chunk === void 0) {
            if (!readAny) {
              setState("error");
              failed = true;
            }
            break;
          }
          readAny = true;
          if (chunk.content.length === 0) break;
          text += chunk.content;
          const advanced = chunk.nextOffset > offset;
          offset = chunk.nextOffset;
          if (!advanced) break;
        } catch {
          if (!active) return;
          if (!readAny) {
            setState("error");
            failed = true;
          }
          break;
        }
      }
      if (!active) return;
      if (!failed) {
        setStats(summarizeDshLog(text));
        setState("ready");
      }
      if (running) timer = setTimeout(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    };
    void tick();
    return () => {
      active = false;
      if (timer !== void 0) clearTimeout(timer);
    };
  }, [task.id, running, refreshSeq]);
  const duration = taskDuration(task, stats);
  const unavailable = t("stats.notAvailable");
  const rows = [
    { label: t("stats.status"), value: statusLabel(task.status, t) },
    { label: t("stats.duration"), value: duration !== void 0 ? formatDuration(duration) : unavailable },
    { label: t("stats.messages"), value: stats !== void 0 ? stats.messages.toLocaleString() : unavailable },
    { label: t("stats.toolCalls"), value: stats !== void 0 ? stats.toolCalls.toLocaleString() : unavailable },
    { label: t("stats.toolResults"), value: stats !== void 0 ? stats.toolResults.toLocaleString() : unavailable },
    { label: t("stats.inputTokens"), value: stats !== void 0 ? stats.inputTokens.toLocaleString() : unavailable },
    { label: t("stats.outputTokens"), value: stats !== void 0 ? stats.outputTokens.toLocaleString() : unavailable },
    {
      label: t("stats.cost"),
      value: stats?.costUsd !== void 0 ? `$${stats.costUsd.toFixed(4)}` : unavailable
    }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: SHELL, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: TOOLBAR, children: [
      running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: RUNNING, children: t("log.running") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => {
            setRefreshSeq((sequence) => sequence + 1);
          },
          style: CHIP,
          children: t("log.refresh")
        }
      )
    ] }),
    state === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: NOTICE, role: "status", children: t("stats.unavailable") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: GRID, children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: CARD, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: CARD_LABEL, children: row.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: CARD_VALUE, children: row.value })
    ] }, row.label)) })
  ] });
}

// src/client/page-stream.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/log-markdown.ts
var MAX_BLOCK_CHARS = 8e3;
var MAX_THINKING_CHARS = 4e3;
var MAX_SUMMARY_CHARS = 120;
var TRUNCATION_NOTE = "\u2026 [truncated]";
var EDIT_HUNK_LIMIT = 30;
var EDIT_CONTEXT_LINES = 2;
var WRITE_LINE_LIMIT = 40;
var WRITE_HEAD_LINES = 10;
var WRITE_TAIL_LINES = 2;
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber2(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function bound(text, budget = MAX_BLOCK_CHARS) {
  if (text.length <= budget) return text;
  const note = `
${TRUNCATION_NOTE}`;
  return `${text.slice(0, Math.max(0, budget - note.length))}${note}`;
}
function short(text) {
  return text.length <= MAX_SUMMARY_CHARS ? text : `${text.slice(0, MAX_SUMMARY_CHARS - 1)}\u2026`;
}
function fence(language, content) {
  const open = "```" + language + "\n";
  const close = "\n```";
  const budget = MAX_BLOCK_CHARS - open.length - close.length;
  return open + bound(content, Math.max(0, budget)) + close;
}
function quote(text) {
  return text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}
function jsonText(value) {
  if (value === void 0) return "{}";
  try {
    return JSON.stringify(value, null, 2) ?? "{}";
  } catch {
    return "{}";
  }
}
function outputText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block2 of content) {
    if (typeof block2 === "string") parts.push(block2);
    else if (isRecord3(block2) && block2.type === "text" && typeof block2.text === "string") {
      parts.push(block2.text);
    }
  }
  return parts.join("\n");
}
function splitLines(value) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
function changedLine(line, kind) {
  return { kind, text: line };
}
function contextLine(line) {
  return { kind: "context", text: line };
}
function diffLines(oldText, newText) {
  const before = splitLines(oldText);
  const after = splitLines(newText);
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) {
    suffix += 1;
  }
  const removed = before.slice(prefix, before.length - suffix);
  const added = after.slice(prefix, after.length - suffix);
  if (removed.length === 0 && added.length === 0) return { lines: [], truncated: false };
  const changed = [
    ...removed.map((line) => changedLine(line, "del")),
    ...added.map((line) => changedLine(line, "add"))
  ];
  const lead = before.slice(Math.max(0, prefix - EDIT_CONTEXT_LINES), prefix);
  const trail = before.slice(before.length - suffix, before.length - suffix + EDIT_CONTEXT_LINES);
  let body;
  let truncated = false;
  if (changed.length > EDIT_HUNK_LIMIT) {
    body = [
      ...changed.slice(0, 2),
      contextLine(TRUNCATION_NOTE),
      ...changed.slice(-2)
    ];
    truncated = true;
  } else {
    body = changed;
  }
  return {
    lines: [...lead.map(contextLine), ...body, ...trail.map(contextLine)],
    truncated
  };
}
function writeChange(content) {
  const lines = splitLines(content);
  if (lines.length > WRITE_LINE_LIMIT) {
    return {
      lines: [
        ...lines.slice(0, WRITE_HEAD_LINES).map((line) => changedLine(line, "add")),
        contextLine(TRUNCATION_NOTE),
        ...lines.slice(-WRITE_TAIL_LINES).map((line) => changedLine(line, "add"))
      ],
      truncated: true
    };
  }
  return { lines: lines.map((line) => changedLine(line, "add")), truncated: false };
}
function multiEditChange(edits, base) {
  const lines = [];
  let truncated = false;
  edits.forEach((entry, index) => {
    if (!isRecord3(entry)) return;
    const oldText = typeof entry.old_string === "string" ? entry.old_string : "";
    const newText = typeof entry.new_string === "string" ? entry.new_string : "";
    if (lines.length > 0) lines.push(contextLine(`\u2500\u2500 edit ${index + 1} \u2500\u2500`));
    const diff = diffLines(oldText, newText);
    lines.push(...diff.lines);
    truncated = truncated || diff.truncated;
  });
  return { ...base, lines, truncated };
}
var WRITE_TOOLS = /* @__PURE__ */ new Set(["write", "edit", "multiedit", "notebookedit"]);
function isWriteTool(name) {
  return WRITE_TOOLS.has(name.toLowerCase());
}
function changePath(input) {
  return nonEmptyString(input.file_path) ?? nonEmptyString(input.path) ?? nonEmptyString(input.notebook_path);
}
function fileChangeBlock(name, input, path) {
  const base = { path, tool: name };
  let result;
  if (Array.isArray(input.edits)) {
    const change = multiEditChange(input.edits, base);
    return {
      kind: "fileChange",
      title: `\u2192 ${name}${path !== void 0 ? ` ${path}` : ""}`,
      markdown: "",
      change
    };
  }
  if (typeof input.content === "string") {
    result = writeChange(input.content);
  } else if (typeof input.old_string === "string" || typeof input.new_string === "string") {
    result = diffLines(
      typeof input.old_string === "string" ? input.old_string : "",
      typeof input.new_string === "string" ? input.new_string : ""
    );
  } else if (typeof input.new_source === "string") {
    result = writeChange(input.new_source);
  } else {
    result = { lines: [], truncated: false };
  }
  return {
    kind: "fileChange",
    title: `\u2192 ${name}${path !== void 0 ? ` ${path}` : ""}`,
    markdown: "",
    change: { ...base, lines: result.lines, truncated: result.truncated }
  };
}
function toolSummary(input) {
  const candidates = [
    input.description,
    input.command,
    input.file_path,
    input.path,
    input.pattern,
    input.query
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.length > 0) return short(value);
  }
  return "";
}
function block(kind, markdown) {
  return { kind, markdown };
}
function assistantEntry(entry, result) {
  switch (entry.type) {
    case "text": {
      const text = nonEmptyString(entry.text);
      if (text !== void 0) result.push(block("assistantText", text));
      break;
    }
    case "thinking": {
      const thinking = nonEmptyString(entry.thinking);
      if (thinking !== void 0) {
        result.push({
          kind: "thinking",
          title: "\u601D\u8003",
          markdown: bound(quote(thinking), MAX_THINKING_CHARS),
          collapsible: true,
          defaultOpen: false
        });
      }
      break;
    }
    case "tool_use": {
      const name = nonEmptyString(entry.name) ?? "tool";
      const source = entry.input ?? entry.arguments;
      const input = isRecord3(source) ? source : {};
      if (isWriteTool(name)) {
        result.push(fileChangeBlock(name, input, changePath(input)));
        break;
      }
      const summary = toolSummary(input);
      result.push({
        kind: "tool",
        title: `\u2192 ${name}${summary.length > 0 ? ` \xB7 ${summary}` : ""}`,
        markdown: fence("json", jsonText(source)),
        collapsible: true,
        defaultOpen: false
      });
      break;
    }
    default:
      break;
  }
}
function assistantBlocks(content) {
  if (typeof content === "string") {
    return content.length > 0 ? [block("assistantText", content)] : [];
  }
  if (!Array.isArray(content)) return [];
  const result = [];
  for (const entry of content) {
    if (isRecord3(entry)) assistantEntry(entry, result);
  }
  return result;
}
function userBlocks(content) {
  if (typeof content === "string") {
    return content.length > 0 ? [block("meta", bound(`> ${content}`))] : [];
  }
  if (!Array.isArray(content)) return [];
  const result = [];
  for (const entry of content) {
    if (!isRecord3(entry)) continue;
    switch (entry.type) {
      case "text": {
        const text = nonEmptyString(entry.text);
        if (text !== void 0) result.push(block("meta", bound(`> ${text}`)));
        break;
      }
      case "tool_result": {
        const output = outputText(entry.content);
        result.push({
          kind: "toolResult",
          title: "\u2190 \u7ED3\u679C",
          markdown: fence("text", output),
          collapsible: true,
          defaultOpen: false
        });
        break;
      }
      default:
        break;
    }
  }
  return result;
}
function sdkContent2(message) {
  const nested = message.message;
  if (isRecord3(nested) && "content" in nested) return nested.content;
  return message.content;
}
function resultBlock(message) {
  const status = nonEmptyString(message.subtype) ?? (message.is_error === true ? "error" : "success");
  const turns = finiteNumber2(message.num_turns);
  const cost = finiteNumber2(message.total_cost_usd) ?? finiteNumber2(message.cost_usd);
  const duration = finiteNumber2(message.duration_ms);
  const parts = [
    `\u2714 ${status}`,
    `${turns !== void 0 ? turns : "\u2014"} turns`,
    `$${cost !== void 0 ? cost : "\u2014"}`,
    duration !== void 0 ? `${duration}ms` : "\u2014"
  ];
  return block("result", bound(`> ${parts.join(" \xB7 ")}`));
}
function errorBlock(entry) {
  const text = nonEmptyString(entry.message) ?? nonEmptyString(entry.error) ?? "error";
  return block("error", bound(`> \u26A0 ${text}`));
}
function dshLogToMarkdown(text) {
  const blocks = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length === 0) continue;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord3(entry)) continue;
    if (entry.kind === "start") {
      const cwd = nonEmptyString(entry.cwd) ?? "\u2014";
      const model = nonEmptyString(entry.model) ?? "\u2014";
      blocks.push(block("meta", bound(`> \u25B6 \u4F1A\u8BDD\u5F00\u59CB \xB7 cwd: ${cwd} \xB7 model: ${model}`)));
      continue;
    }
    if (entry.kind === "end") {
      const status = nonEmptyString(entry.status) ?? "unknown";
      blocks.push(block("meta", bound(`> \u25A0 ${status}`)));
      continue;
    }
    if (entry.kind === "error") {
      blocks.push(errorBlock(entry));
      continue;
    }
    if (entry.kind !== "message" || !isRecord3(entry.message)) continue;
    const message = entry.message;
    if (message.type === "system" && message.subtype === "init") {
      const model = nonEmptyString(message.model) ?? "model";
      const tools = Array.isArray(message.tools) ? message.tools.length : 0;
      blocks.push(block("meta", bound(`> \u6A21\u578B ${model} \xB7 ${tools} tools`)));
    } else if (message.type === "assistant") {
      blocks.push(...assistantBlocks(sdkContent2(message)));
    } else if (message.type === "user") {
      blocks.push(...userBlocks(sdkContent2(message)));
    } else if (message.type === "result") {
      blocks.push(resultBlock(message));
    } else if (message.type === "error") {
      blocks.push(errorBlock(message));
    }
  }
  return blocks;
}

// src/client/page-stream.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var CLAUDE_CODE_TOOL = "subagent_claude_code";
var POLL_INTERVAL_MS2 = 1e3;
var MAX_READS2 = 64;
var PROMPT_HEIGHT = 240;
var MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
var SHELL2 = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  color: "var(--dsw-alias-label-primary)"
};
var TOOLBAR2 = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  flex: "none",
  padding: "12px 20px 8px",
  boxSizing: "border-box"
};
var RUNNING2 = {
  fontSize: 10,
  color: "var(--dsw-alias-label-secondary)"
};
var CHIP2 = {
  padding: "2px 8px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 999,
  background: "transparent",
  font: "inherit",
  fontSize: 11,
  lineHeight: "16px",
  color: "var(--dsw-alias-label-secondary)",
  cursor: "pointer"
};
var SCROLL = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "0 20px 32px",
  boxSizing: "border-box"
};
var COLUMN = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  width: "100%",
  maxWidth: 920,
  margin: "0 auto",
  padding: "14px 4px 0",
  boxSizing: "border-box",
  fontSize: 14,
  lineHeight: 1.6
};
var USER_ROW = {
  display: "flex",
  justifyContent: "flex-end"
};
var USER_COLUMN = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
  maxWidth: "86%"
};
var META = {
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--dsw-alias-label-secondary)",
  textAlign: "right",
  overflowWrap: "anywhere"
};
var USER_BUBBLE = {
  maxWidth: "82%",
  height: PROMPT_HEIGHT,
  overflowY: "auto",
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--dsw-alias-interactive-bg-hover)",
  color: "var(--dsw-alias-label-primary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  boxSizing: "border-box"
};
var SECTION_LABEL = {
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--dsw-alias-label-secondary)"
};
var MUTED = {
  color: "var(--dsw-alias-label-secondary)"
};
var TRUNCATION = {
  marginTop: 4,
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var PLACEHOLDER = {
  ...MUTED,
  fontSize: 13,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word"
};
var NOTE = {
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var DETAILS = {
  borderLeft: "2px solid var(--dsw-alias-border-l1)",
  paddingLeft: 10
};
var SUMMARY = {
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--dsw-alias-label-secondary)",
  cursor: "pointer",
  overflowWrap: "anywhere"
};
var DETAIL_BODY = {
  marginTop: 6
};
var CHANGE_BOX = {
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 8,
  overflow: "hidden",
  fontSize: 12
};
var CHANGE_TITLE = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--dsw-alias-border-l1)",
  fontFamily: MONO_FONT,
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)",
  overflowWrap: "anywhere"
};
var DIFF_BODY = {
  overflowX: "auto",
  padding: "4px 0"
};
var DIFF_LINE = {
  padding: "0 10px",
  fontFamily: MONO_FONT,
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: "pre"
};
var DIFF_COLORS = {
  add: "#2f9e44",
  del: "var(--dsw-alias-state-error-primary)",
  context: "var(--dsw-alias-label-secondary)"
};
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function failureCode(payload) {
  if (isRecord4(payload) && isRecord4(payload.error)) {
    const code = payload.error.code;
    if (typeof code === "string") return code;
  }
  return "read-failed";
}
function chunkOf2(payload) {
  if (!isRecord4(payload) || payload.ok !== true || !isRecord4(payload.value)) return void 0;
  const content = payload.value.content;
  const nextOffset = payload.value.nextOffset;
  if (typeof content !== "string" || typeof nextOffset !== "number" || !Number.isSafeInteger(nextOffset) || nextOffset < 0) {
    return void 0;
  }
  return { content, nextOffset };
}
function metaLine(task, t) {
  const parts = [];
  if (task.tool !== void 0) parts.push(task.tool);
  parts.push(`${t("detail.createdAt")} ${formatTime(task.createdAt)}`);
  if (task.cwd !== void 0) parts.push(task.cwd);
  const options = task.options;
  if (options?.provider !== void 0) parts.push(`${t("detail.provider")}: ${options.provider}`);
  if (options?.model !== void 0) parts.push(`${t("detail.model")}: ${options.model}`);
  if (options?.reasoningEffort !== void 0) parts.push(`${t("detail.reasoning")}: ${options.reasoningEffort}`);
  if (options?.agentPreset !== void 0) parts.push(`${t("detail.preset")}: ${options.agentPreset}`);
  return parts.join(" \xB7 ");
}
function openStyle(kind) {
  switch (kind) {
    case "meta":
    case "result":
    case "error":
      return {
        paddingLeft: 10,
        borderLeft: "2px solid var(--dsw-alias-border-l1)",
        opacity: 0.85
      };
    default:
      return {};
  }
}
function FileChangeView({ change, t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: CHANGE_BOX, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: CHANGE_TITLE, children: change.path ?? `${t("fileChange.title")} \xB7 ${change.tool}` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: DIFF_BODY, children: change.lines.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "div",
      {
        style: { ...DIFF_LINE, color: DIFF_COLORS[line.kind] },
        children: [
          line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ",
          line.text
        ]
      },
      index
    )) }),
    change.truncated ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: TRUNCATION, children: t("fileChange.truncated") }) : null
  ] });
}
function LogBlock({ block: block2, t }) {
  if (block2.kind === "fileChange") {
    const change = block2.change;
    return change !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FileChangeView, { change, t }) : null;
  }
  if (block2.collapsible === true) {
    const title = block2.kind === "thinking" ? t("tool.thinking") : block2.kind === "toolResult" ? t("tool.result") : block2.title ?? block2.kind;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { style: DETAILS, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("summary", { style: SUMMARY, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: DETAIL_BODY, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.MarkdownText, { text: block2.markdown, labels: labelsFor(t) }) })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: openStyle(block2.kind), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.MarkdownText, { text: block2.markdown, labels: labelsFor(t) }) });
}
function labelsFor(t) {
  return {
    code: { copyLabel: t("markdown.copy"), copiedLabel: t("markdown.copied") },
    footnotes: t("markdown.footnotes")
  };
}
function StreamPane({ task, running, t }) {
  const claudeCode = task.tool === CLAUDE_CODE_TOOL;
  const [blocks, setBlocks] = (0, import_react2.useState)([]);
  const [state, setState] = (0, import_react2.useState)("loading");
  const [errorCode, setErrorCode] = (0, import_react2.useState)(void 0);
  const [refreshSeq, setRefreshSeq] = (0, import_react2.useState)(0);
  const scrollRef = (0, import_react2.useRef)(null);
  const runningRef = (0, import_react2.useRef)(running);
  const flushRef = (0, import_react2.useRef)(null);
  const markdownLabels = (0, import_react2.useMemo)(() => labelsFor(t), [t]);
  (0, import_react2.useEffect)(() => {
    runningRef.current = running;
  }, [running]);
  (0, import_react2.useEffect)(() => {
    if (!claudeCode) return;
    let active = true;
    let timer;
    let offset = 0;
    let reading = false;
    setBlocks([]);
    setState("loading");
    setErrorCode(void 0);
    const tick = async () => {
      if (reading) return;
      reading = true;
      try {
        for (let reads = 0; reads < MAX_READS2; reads += 1) {
          let chunk;
          try {
            const query = new URLSearchParams({
              childId: task.id,
              source: "dsh",
              offset: String(offset)
            });
            const response = await fetch(`/api/external-task-context/log?${query.toString()}`, {
              credentials: "same-origin",
              cache: "no-store"
            });
            if (!active) return;
            let payload;
            try {
              payload = await response.json();
            } catch {
              payload = void 0;
            }
            chunk = response.ok ? chunkOf2(payload) : void 0;
            if (chunk === void 0) {
              setState("error");
              setErrorCode(failureCode(payload));
              return;
            }
          } catch {
            if (!active) return;
            setState("error");
            setErrorCode("read-failed");
            return;
          }
          const previousOffset = offset;
          offset = chunk.nextOffset;
          setState("ready");
          if (chunk.content.length > 0) {
            const parsed = dshLogToMarkdown(chunk.content);
            if (parsed.length > 0) setBlocks((previous) => [...previous, ...parsed]);
          }
          if (chunk.content.length === 0 || offset <= previousOffset) return;
        }
      } finally {
        reading = false;
        if (active && runningRef.current) {
          timer = setTimeout(() => {
            void tick();
          }, POLL_INTERVAL_MS2);
        }
      }
    };
    flushRef.current = () => {
      void tick();
    };
    void tick();
    return () => {
      active = false;
      flushRef.current = null;
      if (timer !== void 0) clearTimeout(timer);
    };
  }, [claudeCode, task.id, refreshSeq]);
  (0, import_react2.useEffect)(() => {
    if (!running && claudeCode) {
      const flush = flushRef.current;
      if (flush !== null) flush();
    }
  }, [running, claudeCode]);
  (0, import_react2.useEffect)(() => {
    const element = scrollRef.current;
    if (element !== null) element.scrollTop = element.scrollHeight;
  }, [blocks, task.status, task.answer, task.summary]);
  const truncated = blocks.some((block2) => block2.markdown.includes(TRUNCATION_NOTE));
  const resultText = task.answer ?? task.summary;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: SHELL2, children: [
    claudeCode ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: TOOLBAR2, children: [
      running ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: RUNNING2, children: t("log.running") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          onClick: () => {
            setRefreshSeq((sequence) => sequence + 1);
          },
          style: CHIP2,
          children: t("log.refresh")
        }
      )
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        ref: scrollRef,
        style: SCROLL,
        role: "log",
        "aria-live": "polite",
        "aria-label": t("view.label"),
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: COLUMN, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: USER_ROW, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: USER_COLUMN, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: META, children: metaLine(task, t) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: USER_BUBBLE, children: task.prompt !== void 0 ? task.prompt : t("detail.promptMissing") }),
            task.promptTruncated === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: TRUNCATION, children: t("detail.truncated") }) : null
          ] }) }),
          claudeCode ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            blocks.map((block2, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LogBlock, { block: block2, t }, index)),
            blocks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: PLACEHOLDER, role: "status", children: state === "loading" || running ? t("log.waiting") : t("log.empty") }) : null,
            state === "error" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: NOTE, role: "status", children: [
              t("log.unavailable"),
              errorCode !== void 0 ? ` (${errorCode})` : ""
            ] }) : null,
            truncated ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: NOTE, children: t("markdown.truncated") }) : null,
            task.status !== "pending" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: SECTION_LABEL, children: t("conversation.result") }),
              resultText !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.MarkdownText, { text: resultText, labels: markdownLabels }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: MUTED, children: t("conversation.emptyResult") }),
              task.answerTruncated === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: TRUNCATION, children: t("detail.truncated") }) : null,
              task.completedAt !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...META, marginTop: 6, textAlign: "left" }, children: `${t("detail.completedAt")} ${formatTime(task.completedAt)}` }) : null
            ] }) : null
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: NOTE, children: t("page.unsupported") })
        ] })
      }
    )
  ] });
}

// src/client/page.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var CLAUDE_CODE_TOOL2 = "subagent_claude_code";
var SHELL3 = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  color: "var(--dsw-alias-label-primary)",
  fontSize: 13,
  lineHeight: 1.5
};
var TOOLBAR3 = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  flex: "none",
  padding: "12px 20px 8px",
  borderBottom: "1px solid var(--dsw-alias-border-l1)",
  boxSizing: "border-box"
};
var DOT = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  flex: "none",
  background: "var(--dsw-alias-label-secondary)"
};
var STATUS = {
  flex: "none",
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var META2 = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var SPACER = {
  flex: 1
};
var SELECT = {
  maxWidth: 220,
  height: 26,
  padding: "0 6px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--dsw-alias-label-primary)",
  font: "inherit",
  fontSize: 12,
  cursor: "pointer"
};
var CHIP3 = {
  padding: "2px 10px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 999,
  background: "transparent",
  font: "inherit",
  fontSize: 11,
  lineHeight: "16px",
  color: "var(--dsw-alias-label-secondary)",
  cursor: "pointer"
};
var CHIP_ACTIVE = {
  ...CHIP3,
  background: "var(--dsw-alias-interactive-bg-hover)",
  color: "var(--dsw-alias-label-primary)"
};
var CHIP_DISABLED = {
  ...CHIP3,
  cursor: "default",
  opacity: 0.45
};
var CONTENT = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  overflow: "hidden"
};
var STATS_SCROLL = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "0 20px",
  boxSizing: "border-box"
};
var NOTICE_SHELL = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  flex: 1,
  minHeight: 0,
  padding: 24,
  boxSizing: "border-box"
};
var NOTICE_BOX = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  maxWidth: 460,
  padding: 20,
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 10,
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 12
};
var NOTICE_TITLE = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--dsw-alias-label-primary)"
};
var STATUS_DOT_COLORS = {
  pending: "var(--dsw-alias-label-secondary)",
  completed: "var(--dsw-alias-label-primary)",
  aborted: "var(--dsw-alias-label-secondary)",
  "max-tokens": "var(--dsw-alias-label-secondary)",
  refusal: "var(--dsw-alias-label-secondary)",
  error: "var(--dsw-alias-label-primary)",
  unknown: "var(--dsw-alias-label-secondary)"
};
function taskLabel(task) {
  return task.label ?? shortId(task.id);
}
function Notice({ title, hint }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: NOTICE_SHELL, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: NOTICE_BOX, role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: NOTICE_TITLE, children: title }),
    hint !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: hint }) : null
  ] }) });
}
function ExternalTaskView({ useProjection, t }) {
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS);
  const [selectedId, setSelectedId] = (0, import_react3.useState)(void 0);
  const [mode, setMode] = (0, import_react3.useState)("conversation");
  if (tasks === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Notice, { title: t("page.unavailable"), hint: t("page.unavailableHint") });
  }
  if (tasks.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Notice, { title: t("page.empty") });
  }
  const active = (selectedId !== void 0 ? tasks.find((task) => task.id === selectedId) : void 0) ?? tasks[tasks.length - 1];
  if (active === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Notice, { title: t("page.empty") });
  }
  const running = active.status === "pending";
  const claudeCode = active.tool === CLAUDE_CODE_TOOL2;
  const effectiveMode = mode === "stats" && !claudeCode ? "conversation" : mode;
  const meta = [active.tool, `${t("detail.createdAt")} ${formatTime(active.createdAt)}`].filter((part) => part !== void 0).join(" \xB7 ");
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: SHELL3, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: TOOLBAR3, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { ...DOT, background: STATUS_DOT_COLORS[active.status] }, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: STATUS, children: statusLabel(active.status, t) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: META2, children: meta }),
      tasks.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "select",
        {
          "aria-label": t("page.taskSelectAria"),
          value: active.id,
          onChange: (event) => {
            setSelectedId(event.target.value);
          },
          style: SELECT,
          children: tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: task.id, children: taskLabel(task) }, task.id))
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: SPACER }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          "aria-pressed": effectiveMode === "conversation",
          onClick: () => {
            setMode("conversation");
          },
          style: effectiveMode === "conversation" ? CHIP_ACTIVE : CHIP3,
          children: t("view.mode.conversation")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          "aria-pressed": effectiveMode === "stats",
          disabled: !claudeCode,
          onClick: () => {
            if (claudeCode) setMode("stats");
          },
          style: !claudeCode ? CHIP_DISABLED : effectiveMode === "stats" ? CHIP_ACTIVE : CHIP3,
          children: t("view.mode.stats")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: CONTENT, children: effectiveMode === "stats" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: STATS_SCROLL, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StatsPane, { task: active, running, t }) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StreamPane, { task: active, running, t }) })
  ] });
}

// src/client/index.tsx
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "external-task-context: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: "external-task",
    order: 15,
    label: () => t("view.label"),
    locale: NS
  }, ExternalTaskView));
}

    return module.exports
  },
})
