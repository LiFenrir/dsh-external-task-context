# External Task Context (dsh-external-task-context)

Inspect the delegation prompt, runtime context, and returned outcome of external subagent tasks (Claude Code, Codex, ACP) in the DSH Web right sidebar.

## Features and location

- **Session header button**: when the current session has recorded external tasks, an "External tasks N" button appears in the header. Clicking it opens this plugin's page in the right sidebar (a new pane when layout room allows).
- **Right-sidebar panel**: the left column lists external tasks (label or short id, status, start time); the right column shows the selected task. The newest task is selected by default; an explicit selection is kept while it exists and falls back to the newest when it disappears.
- **Details**: status, start/completion time, tool name, delegation prompt, working directory, provider/model/reasoning effort/agent preset, returned content, and settlement summary. Prompts and answers longer than 64 KiB are truncated with a localized notice.

## Data sources

Everything shown is already recorded in the **parent session log**; the plugin adds no session event and changes no model-visible behavior:

1. `tool/call`: the delegation tool's argument JSON. `description` is the catalog label; `prompt` is the delegated task; optional `cwd`, `provider`, `model`, `reasoning_effort`, and `agent_preset` are the runtime context.
2. `subagent/catalog` v2: `{ version: 2, childId, childCreatedAt, mode: 'external', label? }`, which establishes the stable child id.
3. A later `user/message` with `source.kind === 'subagent-settled'`: `source.summary` states how it ended; the text blocks are the summary line, `Its closing message:` or `It left no closing message.`, the child's final text, an optional `Structured result: ...`, and an optional diagnostic.

The host folds those events into the `externalTaskContexts` projection; the client only reads that projection.

## Known limitations

External providers (Claude Code, Codex, ACP) run out of process; DSH does not persist their internal steps or tool-call records, and an external child has no local Session or transcript. This plugin can therefore show only the delegation context and returned outcome — never the external agent's private context, internal reasoning, or full tool-call chain.

In DSH `0.2.1-rc.2`, the Claude Code provider uses `persistSession: false`, so even its process-local session is not retained.

Also:

- Label matching is done only when unambiguous: the earliest unpaired call with the same catalog label wins; without a label match, a single unpaired call is used; with several candidates the prompt and options stay absent rather than guessed.
- Only the newest 20 unpaired delegation calls are retained.
- Fork-inherited events (`seq < inheritedEventCount`) are not attributed to the current session.

## Installation

Requires DSH `0.2.2-alpha.2` or newer and Node `^22.19 || >=24`.

### From npm

```sh
dsh plugin add @lifenrir/dsh-external-task-context
```

### From git

```sh
dsh plugin add git+https://github.com/LiFenrir/dsh-external-task-context.git
```

### From a local directory

```sh
git clone https://github.com/LiFenrir/dsh-external-task-context.git
cd dsh-external-task-context
pnpm install
pnpm run build
dsh plugin add /absolute/path/to/dsh-external-task-context
```

The local build produces `lib/index.js` (host) and `lib/client.js` (web client).

Then enable the bundle in that profile. Restart the app or reopen the session so the host projection and client bundle load.

## Usage

1. Ask the model to delegate work through an external subagent tool (Claude Code, Codex, or ACP).
2. Once the delegation appears, the header shows an "External tasks" button; click it.
3. Pick a task in the left column to inspect its prompt, runtime context, and returned outcome.

## Privacy

The projection is persisted with the session projection cache, so prompts and returned content are stored a second time outside the session log (the content already exists in the session log). Treat them with the same sensitivity in shared environments or when exporting a session.
