# External Task Context (dsh-external-task-context)

Inspect the delegation prompt, runtime context, and returned outcome of external subagent tasks (Claude Code, Codex, ACP) in a dedicated conversation view tab of the DSH Web app.

## Features and location

- **Conversation view tab**: the plugin registers the `external-task` entry in the session header's View tab row (`Conversation / Traces / Context / Orchestration / Statistics / …`, labeled "External tasks"). Selecting it renders the plugin inside the session body; there is no global panel or header button.
- **Toolbar**: shows the active task's status, tool, and start time. When more than one task exists, a task selector switches between them; the newest task is selected by default, an explicit selection is kept while it exists, and a task that disappears falls back to the newest. Two chips, `Conversation / Statistics`, switch the body.
- **Conversation**: one streamed, Markdown-rendered conversation. The delegation prompt is the right-aligned user bubble (with a metadata line above it) in a fixed 240px-high box that scrolls internally for long prompts. For Claude Code tasks, the live DSH run log is appended below it while the task executes, and the returned content or settlement summary is appended last once the task settles.
- **Log blocks**: assistant prose renders open; thinking, tool calls, and tool results are collapsed by default and expand on click. Write/Edit-style calls render a diff with removed lines red, added lines green, and muted context, limited to the changed hunk plus two context lines; oversized hunks and long Write content show an explicit truncation marker. The log always reads the DSH trace only.
- **Statistics (Claude Code only)**: aggregate state, duration, message/tool-call/tool-result counts, last reported input/output tokens, and reported cost, computed from the complete DSH log. While the task runs, the aggregates refresh every two seconds; a manual refresh is always available.

## Data sources

Everything shown is already recorded in the **parent session log**; the plugin adds no session event and changes no model-visible behavior:

1. `tool/call`: the delegation tool's argument JSON. `description` is the catalog label; `prompt` is the delegated task; optional `cwd`, `provider`, `model`, `reasoning_effort`, and `agent_preset` are the runtime context.
2. `subagent/catalog` v2 and v3: `{ version: 2 | 3, childId, childCreatedAt, mode: 'external', label? }`, which establishes the stable child id. Version 3 adds a required `name` field; it is currently ignored, so the UI is unchanged.
3. A later `user/message` with `source.kind === 'subagent-settled'`: `source.summary` states how it ended; the text blocks are the summary line, `Its closing message:` or `It left no closing message.`, the child's final text, an optional `Structured result: ...`, and an optional diagnostic.

The host folds those events into the `externalTaskContexts` projection; the client only reads that projection.

## Run logs (Claude Code only)

While a Claude Code task runs, `@deepseek-ai/dsh-subagent-claude-code` writes its execution log at `<DSH_HOME>/logs/subagent-claude-code/<runId>.jsonl` — one JSON record per line: `start`, every raw SDK message, then `end`. `runId` is the task's catalog `childId`.

The plugin reads it through its authenticated Fetch route `GET /api/external-task-context/log?childId=…&source=dsh&offset=…`, which returns only complete newline-terminated UTF-8 lines so the viewer can tail a growing file. The client polls once a second while the task is pending and stops when it settles. Claude Code's native transcript is not fetched or shown.

Logs are written with mode `0600` in a `0700` directory and are pruned after 7 days by default. Older tasks recorded before this feature have no log.

## Known limitations

External providers (Claude Code, Codex, ACP) run out of process; DSH does not persist their internal steps or tool-call records. Run logs are implemented for the Claude Code provider only; Codex and ACP tasks show the delegation context and returned outcome without a live log.

Also:

- Label matching is done only when unambiguous: the earliest unpaired call with the same catalog label wins; without a label match, a single unpaired call is used; with several candidates the prompt and options stay absent rather than guessed.
- Only the newest 20 unpaired delegation calls are retained.
- Fork-inherited events (`seq < inheritedEventCount`) are not attributed to the current session.

## Installation

Requires DSH `0.2.2-rc.1` or newer and Node `^22.19 || >=24`. Live run logs need a provider with run-log support: the official `0.2.2-rc.1` enables it through the patch package in `patch/`; master builds include it.

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

## Official release

The official DSH `0.2.2-rc.1` provider does not write run logs, so live logs and statistics are unavailable with the stock package. Install the patch package in [`patch/`](patch/) to rebuild the provider with run-log support:

```sh
# Before the patch package is published, run it from the plugin root.
node patch/install.mjs --profile desktop --dry-run # preview without writes
node patch/install.mjs --profile desktop           # patch the installed provider
node patch/install.mjs --profile desktop --restore # revert to the original file

# Once published, the npx shortcut works.
npx @lifenrir/dsh-external-task-context-patch --profile desktop
npx @lifenrir/dsh-external-task-context-patch --profile desktop --dry-run
npx @lifenrir/dsh-external-task-context-patch --profile desktop --restore
```

It replaces only the provider's `lib/index.js` after backing it up, then requires a DSH restart. See [`patch/README.md`](patch/README.md) for `--source`, supported versions, and upgrade notes.

## Usage

1. Ask the model to delegate work through an external subagent tool (Claude Code, Codex, or ACP).
2. Open the "External tasks" tab in the session header's View tab row.
3. Read the delegation prompt, the streamed run log, and the returned outcome under `Conversation`. For Claude Code tasks, use `Statistics` for aggregate counters.
4. Use the task selector when the session recorded several tasks; switch back to another View tab to return to the chat.

## Privacy

The projection is persisted with the session projection cache, so prompts and returned content are stored a second time outside the session log (the content already exists in the session log). Treat them with the same sensitivity in shared environments or when exporting a session.
