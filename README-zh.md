# 外部任务上下文（dsh-external-task-context）

在 DSH Web 的会话视图标签页中查看外部子任务（Claude Code、Codex、ACP）收到的委派提示词、运行上下文和最终返回结果。

## Features and location

- **会话视图标签页**：插件在会话标题栏的视图标签行（`对话 / 轨迹 / 上下文 / 编排 / 统计 …`）注册 `external-task` 条目，标签为「外部任务」。选中后组件渲染在会话正文内；没有全局面板，也没有标题栏按钮。
- **工具栏**：显示当前任务的状态、工具与开始时间。存在多个任务时提供任务选择器；默认选中最新任务，手动选择后保持该选择，任务消失时回落到最新任务。`对话 / 统计` 两个小标签切换正文。
- **对话**：一个流式、Markdown 渲染的对话。委派提示词以右对齐用户气泡呈现，气泡上方是元信息行；气泡固定 240px 高，超长提示词在内部滚动。Claude Code 任务执行期间，DSH 运行日志实时追加在下方；任务结束后，返回内容或结束摘要追加在最后。
- **日志块**：助手正文直接展开；思考、工具调用与工具结果默认折叠，点击展开。Write/Edit 类调用渲染为 diff：删除行红色、新增行绿色、上下文灰色弱化，仅保留变更片段及前后各两行上下文；超长变更片段与超长 Write 内容会显示明确的截断标记。日志只读取 DSH 轨迹。
- **统计（仅 Claude Code）**：从完整 DSH 日志聚合状态、耗时、消息数、工具调用数、工具结果数、最后一次上报的输入/输出 token 与上报成本。任务运行中每 2 秒刷新一次，也可以手动刷新。

## Data sources

面板展示的内容全部来自 DSH 已经写入**父会话日志**的记录，插件不新增任何会话事件，也不改变模型可见行为：

1. `tool/call`：委派工具的调用参数 JSON，其中 `description` 是目录标签，`prompt` 是委派任务；可选的 `cwd`、`provider`、`model`、`reasoning_effort`、`agent_preset` 作为运行上下文。
2. `subagent/catalog` v2 与 v3：`{ version: 2 | 3, childId, childCreatedAt, mode: 'external', label? }`，用于为外部任务建立稳定的子会话 id。v3 新增必填字段 `name`，当前忽略该字段，界面行为不变。
3. 之后到达的 `user/message`：`source.kind === 'subagent-settled'`，`source.summary` 说明结束方式，文本块依次是摘要行、`Its closing message:` 或 `It left no closing message.`、子任务最终文本、可选的 `Structured result: ...` 与诊断信息。

宿主侧把这些事件折叠成 `externalTaskContexts` 投影；客户端只读取该投影并渲染。

## 运行日志（仅 Claude Code）

Claude Code 任务执行期间，宿主侧的 `@deepseek-ai/dsh-subagent-claude-code` 会写入运行日志 `<DSH_HOME>/logs/subagent-claude-code/<runId>.jsonl`，每行一条 JSON 记录：`start`、逐条原始 SDK 消息、`end`。`runId` 即任务的 catalog `childId`。

插件通过认证 Fetch 路由 `GET /api/external-task-context/log?childId=…&source=dsh&offset=…` 增量读取，只返回以换行结尾的完整 UTF-8 行，因此可以安全地跟随增长中的文件。任务处于 pending 时客户端每秒轮询一次，结束后停止。Claude Code 自身的原生 transcript 不再读取或展示。

日志以 `0600` 权限写入 `0700` 目录，默认保留 7 天。升级本功能之前的旧任务没有日志。

## Known limitations

外部提供方（Claude Code、Codex、ACP）在独立进程中运行；DSH 不会持久化它们的内部步骤和工具调用记录。运行日志目前只为 Claude Code 提供方实现；Codex 与 ACP 任务仍只展示委派上下文与返回结果，没有实时日志。

另外：

- 标签匹配只在能够唯一确定时进行：优先使用目录标签匹配最早的未配对调用；没有标签匹配且恰好只有一个未配对调用时才采用它；存在多个候选时不猜测，提示词和选项保持缺失。
- 只保留最近 20 个尚未与目录条目配对的委派调用。
- Fork 继承的历史事件（`seq < inheritedEventCount`）不会被归属到当前会话。

## Installation

要求 DSH `0.2.2-rc.1` 或更高版本，Node `^22.19 || >=24`。实时运行日志需要提供方支持：官方 `0.2.2-rc.1` 通过 `patch/` 补丁包启用；master 构建已内置。

### 从 npm 安装

```sh
dsh plugin add @lifenrir/dsh-external-task-context
```

### 从 git 安装

```sh
dsh plugin add git+https://github.com/LiFenrir/dsh-external-task-context.git
```

### 从本地目录安装

```sh
git clone https://github.com/LiFenrir/dsh-external-task-context.git
cd dsh-external-task-context
pnpm install
pnpm run build
dsh plugin add /absolute/path/to/dsh-external-task-context
```

本地构建产物为 `lib/index.js`（宿主）与 `lib/client.js`（Web 客户端）。

安装后在对应 profile 中启用该 bundle。需要重启应用或重新打开会话，使宿主投影与客户端 bundle 重新加载。

## 官方发行版

DSH 官方 `0.2.2-rc.1` 的提供方不写运行日志，因此原版包没有实时日志与统计。安装 [`patch/`](patch/) 中的补丁包，可为已安装的提供方重新构建带运行日志支持的版本：

```sh
# 未发布到 npm 时，从插件根目录运行。
node patch/install.mjs --profile desktop --dry-run # 预览，不写入
node patch/install.mjs --profile desktop           # 为已安装的提供方打补丁
node patch/install.mjs --profile desktop --restore # 还原原始文件

# 发布后也可用 npx。
npx @lifenrir/dsh-external-task-context-patch --profile desktop
npx @lifenrir/dsh-external-task-context-patch --profile desktop --dry-run
npx @lifenrir/dsh-external-task-context-patch --profile desktop --restore
```

补丁只替换提供方的 `lib/index.js`（替换前先备份），完成后需要重启 DSH。`--source`、支持版本与升级说明见 [`patch/README-zh.md`](patch/README-zh.md)。

## Usage

1. 在会话中让模型通过外部子任务工具委派工作（例如 Claude Code、Codex、ACP）。
2. 在会话标题栏的视图标签行中打开「外部任务」。
3. 在「对话」中查看委派提示词、流式运行日志与返回结果；Claude Code 任务可在「统计」查看聚合计数。
4. 会话记录多个任务时用任务选择器切换；切回其他视图标签即可回到聊天。

## Privacy

投影会随会话投影缓存一起持久化。提示词和返回内容因此会在会话日志之外再保存一份（内容本身已经存在于会话日志中）。请在共享环境或导出会话时按同样的敏感度处理这些数据。
