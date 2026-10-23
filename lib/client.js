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

// src/client/action.tsx
var import_react = require("react");

// src/shared/projection.ts
var EXTERNAL_TASK_CONTEXTS = "externalTaskContexts";

// src/client/locales.ts
var NS = "externalTaskContext";
var zh = {
  "action.label": "\u5916\u90E8\u4EFB\u52A1 {count}",
  "action.tooltip": "\u67E5\u770B\u5916\u90E8\u4EFB\u52A1\u4E0A\u4E0B\u6587",
  "panel.title": "\u5916\u90E8\u4EFB\u52A1\u4E0A\u4E0B\u6587",
  "panel.subtitle": "\u59D4\u6D3E\u63D0\u793A\u8BCD\u3001\u8FD0\u884C\u4E0A\u4E0B\u6587\u4E0E\u8FD4\u56DE\u7ED3\u679C",
  "panel.empty": "\u5F53\u524D\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u5916\u90E8\u4EFB\u52A1\u8BB0\u5F55\u3002",
  "panel.unavailable": "\u6295\u5F71\u4E0D\u53EF\u7528",
  "panel.unavailableHint": "\u8BF7\u786E\u8BA4\u5916\u90E8\u4EFB\u52A1\u4E0A\u4E0B\u6587\u63D2\u4EF6\u5DF2\u5728\u5F53\u524D\u914D\u7F6E\u4E2D\u542F\u7528\uFF0C\u7136\u540E\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u3002",
  "panel.selectHint": "\u8BF7\u9009\u62E9\u4E00\u4E2A\u4EFB\u52A1\u67E5\u770B\u8BE6\u60C5\u3002",
  "panel.listAria": "\u5916\u90E8\u4EFB\u52A1\u5217\u8868",
  "detail.status": "\u72B6\u6001",
  "detail.createdAt": "\u5F00\u59CB\u65F6\u95F4",
  "detail.completedAt": "\u5B8C\u6210\u65F6\u95F4",
  "detail.tool": "\u5DE5\u5177",
  "detail.prompt": "\u59D4\u6D3E\u63D0\u793A\u8BCD",
  "detail.promptMissing": "\u672A\u8BB0\u5F55\u59D4\u6D3E\u63D0\u793A\u8BCD\u3002",
  "detail.context": "\u8FD0\u884C\u4E0A\u4E0B\u6587",
  "detail.cwd": "\u5DE5\u4F5C\u76EE\u5F55",
  "detail.provider": "\u63D0\u4F9B\u65B9",
  "detail.model": "\u6A21\u578B",
  "detail.reasoning": "\u63A8\u7406\u5F3A\u5EA6",
  "detail.preset": "Agent \u9884\u8BBE",
  "detail.answer": "\u8FD4\u56DE\u5185\u5BB9",
  "detail.answerPending": "\u5C1A\u672A\u8BB0\u5F55\u8FD4\u56DE\u7ED3\u679C\uFF08\u4EFB\u52A1\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF09\u3002",
  "detail.answerEmpty": "\u4EFB\u52A1\u5DF2\u7ED3\u675F\uFF0C\u4F46\u6CA1\u6709\u8FD4\u56DE\u6587\u672C\u7ED3\u679C\u3002",
  "detail.summary": "\u7ED3\u675F\u6458\u8981",
  "detail.truncated": "\u5185\u5BB9\u8FC7\u957F\uFF0C\u5DF2\u622A\u65AD\u663E\u793A\u3002",
  "status.pending": "\u8FDB\u884C\u4E2D",
  "status.completed": "\u5DF2\u5B8C\u6210",
  "status.aborted": "\u5DF2\u4E2D\u6B62",
  "status.maxTokens": "\u8F93\u51FA\u8FBE\u5230\u4E0A\u9650",
  "status.refusal": "\u5DF2\u62D2\u7EDD\u4EFB\u52A1",
  "status.error": "\u5931\u8D25",
  "status.unknown": "\u672A\u77E5"
};
var en = {
  "action.label": "External tasks {count}",
  "action.tooltip": "Inspect external task context",
  "panel.title": "External task context",
  "panel.subtitle": "Delegation prompt, runtime context, and returned outcome",
  "panel.empty": "This session has no external task records yet.",
  "panel.unavailable": "Projection unavailable",
  "panel.unavailableHint": "Confirm the external task context plugin is enabled in this profile, then reopen the session.",
  "panel.selectHint": "Select a task to see its details.",
  "panel.listAria": "External task list",
  "detail.status": "Status",
  "detail.createdAt": "Started",
  "detail.completedAt": "Completed",
  "detail.tool": "Tool",
  "detail.prompt": "Delegation prompt",
  "detail.promptMissing": "No delegation prompt was recorded.",
  "detail.context": "Runtime context",
  "detail.cwd": "Working directory",
  "detail.provider": "Provider",
  "detail.model": "Model",
  "detail.reasoning": "Reasoning effort",
  "detail.preset": "Agent preset",
  "detail.answer": "Returned content",
  "detail.answerPending": "No result recorded yet (the task may still be running).",
  "detail.answerEmpty": "The task ended without a text result.",
  "detail.summary": "Settlement summary",
  "detail.truncated": "The content was too long and is truncated.",
  "status.pending": "Running",
  "status.completed": "Completed",
  "status.aborted": "Stopped",
  "status.maxTokens": "Token limit reached",
  "status.refusal": "Task declined",
  "status.error": "Failed",
  "status.unknown": "Unknown"
};

// src/client/action.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function ContextIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
      style: { flex: "none" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "14", height: "11", rx: "3", stroke: "currentColor", strokeWidth: "1.6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 8.5h6M7 11.5h3.5", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "16.5", cy: "15.5", r: "3", stroke: "currentColor", strokeWidth: "1.6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m18.7 17.7 2.3 2.3", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })
      ]
    }
  );
}
var BASE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 8px",
  border: "1px solid var(--dsw-alias-border-l1)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--dsw-alias-label-secondary)",
  font: "inherit",
  fontSize: 12,
  lineHeight: 1,
  cursor: "pointer",
  whiteSpace: "nowrap"
};
var HOVER_STYLE = {
  color: "var(--dsw-alias-label-primary)",
  background: "var(--dsw-alias-interactive-bg-hover)"
};
function ExternalTaskContextAction({ useProjection, openPanel, t }) {
  const [hovered, setHovered] = (0, import_react.useState)(false);
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS);
  if (tasks === void 0 || tasks.length === 0) return null;
  const label = t("action.label", { count: tasks.length });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      title: t("action.tooltip"),
      "aria-label": label,
      onClick: openPanel,
      onMouseEnter: () => {
        setHovered(true);
      },
      onMouseLeave: () => {
        setHovered(false);
      },
      style: hovered ? { ...BASE_STYLE, ...HOVER_STYLE } : BASE_STYLE,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContextIcon, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })
      ]
    }
  );
}

// src/client/panel.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var SHELL = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  color: "var(--dsw-alias-label-primary)",
  fontSize: 13,
  lineHeight: 1.5
};
var HEADER = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "12px 14px 10px",
  borderBottom: "1px solid var(--dsw-alias-border-l1)",
  flex: "none"
};
var TITLE = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--dsw-alias-label-primary)"
};
var SUBTITLE = {
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var BODY = {
  display: "flex",
  flex: 1,
  minHeight: 0
};
var LIST_COLUMN = {
  width: "38%",
  minWidth: 150,
  maxWidth: 260,
  flex: "none",
  minHeight: 0,
  overflowY: "auto",
  borderRight: "1px solid var(--dsw-alias-border-l1)",
  padding: 8,
  boxSizing: "border-box"
};
var LIST = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2
};
var LIST_BUTTON_BASE = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 2,
  width: "100%",
  padding: "6px 8px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer"
};
var LIST_LABEL = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12
};
var LIST_META = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 10,
  color: "var(--dsw-alias-label-secondary)"
};
var DETAIL_COLUMN = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: "auto",
  padding: "12px 14px 20px",
  boxSizing: "border-box"
};
var SECTION_TITLE = {
  margin: "0 0 4px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--dsw-alias-label-secondary)"
};
var ROW = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  padding: "2px 0"
};
var ROW_LABEL = {
  flex: "none",
  minWidth: 64,
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var ROW_VALUE = {
  minWidth: 0,
  fontSize: 12,
  color: "var(--dsw-alias-label-primary)",
  wordBreak: "break-word"
};
var PRE_WRAP = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 12,
  color: "var(--dsw-alias-label-primary)"
};
var MONO = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 11,
  color: "var(--dsw-alias-label-primary)",
  wordBreak: "break-all"
};
var MUTED = {
  fontSize: 12,
  color: "var(--dsw-alias-label-secondary)"
};
var TRUNCATION = {
  marginTop: 4,
  fontSize: 11,
  color: "var(--dsw-alias-label-secondary)"
};
var NOTICE_SHELL = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 20,
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 12
};
var NOTICE_TITLE = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--dsw-alias-label-primary)"
};
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
function Row({ label, value }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: ROW, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: ROW_LABEL, children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: ROW_VALUE, children: value })
  ] });
}
function Section({ title, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { style: { marginTop: 14 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { style: SECTION_TITLE, children: title }),
    children
  ] });
}
function Notice({ title, hint }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: NOTICE_SHELL, role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: NOTICE_TITLE, children: title }),
    hint !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: hint }) : null
  ] });
}
function TaskDetail({ task, t }) {
  const options = task.options;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.status"), value: statusLabel(task.status, t) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.createdAt"), value: formatTime(task.createdAt) }),
    task.completedAt !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.completedAt"), value: formatTime(task.completedAt) }) : null,
    task.tool !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.tool"), value: task.tool }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Section, { title: t("detail.prompt"), children: task.prompt !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: PRE_WRAP, children: task.prompt }),
      task.promptTruncated === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: TRUNCATION, children: t("detail.truncated") }) : null
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: MUTED, children: t("detail.promptMissing") }) }),
    task.cwd !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Section, { title: t("detail.cwd"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: MONO, children: task.cwd }) }) : null,
    options !== void 0 && (options.provider !== void 0 || options.model !== void 0 || options.reasoningEffort !== void 0 || options.agentPreset !== void 0) ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Section, { title: t("detail.context"), children: [
      options?.provider !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.provider"), value: options.provider }) : null,
      options?.model !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.model"), value: options.model }) : null,
      options?.reasoningEffort !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.reasoning"), value: options.reasoningEffort }) : null,
      options?.agentPreset !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { label: t("detail.preset"), value: options.agentPreset }) : null
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Section, { title: t("detail.answer"), children: task.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: MUTED, children: t("detail.answerPending") }) : task.answer !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: PRE_WRAP, children: task.answer }),
      task.answerTruncated === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: TRUNCATION, children: t("detail.truncated") }) : null
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: MUTED, children: t("detail.answerEmpty") }) }),
    task.summary !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Section, { title: t("detail.summary"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: PRE_WRAP, children: task.summary }) }) : null
  ] });
}
function ExternalTaskContextPanel({ useProjection, t }) {
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS);
  const [selectedId, setSelectedId] = (0, import_react2.useState)(void 0);
  if (tasks === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Notice, { title: t("panel.unavailable"), hint: t("panel.unavailableHint") });
  }
  if (tasks.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Notice, { title: t("panel.empty") });
  }
  const active = (selectedId !== void 0 ? tasks.find((task) => task.id === selectedId) : void 0) ?? tasks[tasks.length - 1];
  if (active === void 0) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Notice, { title: t("panel.selectHint") });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: SHELL, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: HEADER, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: TITLE, children: t("panel.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: SUBTITLE, children: t("panel.subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: BODY, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: LIST_COLUMN, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { style: LIST, "aria-label": t("panel.listAria"), children: tasks.map((task) => {
        const selected = task.id === active.id;
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            "aria-current": selected ? "true" : void 0,
            onClick: () => {
              setSelectedId(task.id);
            },
            style: selected ? {
              ...LIST_BUTTON_BASE,
              background: "var(--dsw-alias-interactive-bg-hover)",
              color: "var(--dsw-alias-label-primary)"
            } : {
              ...LIST_BUTTON_BASE,
              color: "var(--dsw-alias-label-secondary)"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: LIST_LABEL, children: task.label ?? shortId(task.id) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: LIST_META, children: [
                statusLabel(task.status, t),
                " \xB7 ",
                formatTime(task.createdAt)
              ] })
            ]
          }
        ) }, task.id);
      }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: DETAIL_COLUMN, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TaskDetail, { task: active, t }) })
    ] })
  ] });
}

// src/client/index.tsx
var PLUGIN_ID = "dsh-external-task-context";
var TAB_KIND = "external-task-context";
var inject = ["slots", "locale", "sidebarRight", "sidebarRightTabs"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "external-task-context: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: PLUGIN_ID,
    kind: TAB_KIND,
    title: () => t("panel.title")
  }), "external-task-context: tab type");
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: PLUGIN_ID,
    locale: NS
  }, ExternalTaskContextPanel));
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: "external-task-context",
    order: 15,
    locale: NS,
    inject: () => ({
      openPanel: () => {
        ctx.sidebarRight.openTab(TAB_KIND, { preferNewPane: true });
      }
    })
  }, ExternalTaskContextAction));
}

    return module.exports
  },
})
