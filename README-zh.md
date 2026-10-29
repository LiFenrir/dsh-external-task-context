# 外部任务上下文（dsh-external-task-context）

在 DSH Web 的右侧栏查看外部子任务（Claude Code、Codex、ACP）收到的委派提示词、运行上下文和最终返回结果。

## Features and location

- **会话标题栏按钮**：当前会话记录过外部任务时，标题栏出现「外部任务 N」按钮；点击后在右侧栏打开本插件的页面（布局允许时优先新开分栏）。
- **右侧栏面板**：左侧是外部任务列表（标签或短 id、状态、开始时间），右侧显示选中任务的详情。默认选中最新任务；手动选择后保持该选择，任务消失时回落到最新任务。
- **详情内容**：状态、开始/完成时间、工具名、委派提示词、工作目录、提供方/模型/推理强度/Agent 预设、返回内容与结束摘要。提示词或返回内容超过 64 KiB 时截断显示，并给出本地化提示。

## Data sources

面板展示的内容全部来自 DSH 已经写入**父会话日志**的记录，插件不新增任何会话事件，也不改变模型可见行为：

1. `tool/call`：委派工具的调用参数 JSON，其中 `description` 是目录标签，`prompt` 是委派任务；可选的 `cwd`、`provider`、`model`、`reasoning_effort`、`agent_preset` 作为运行上下文。
2. `subagent/catalog` v2：`{ version: 2, childId, childCreatedAt, mode: 'external', label? }`，用于为外部任务建立稳定的子会话 id。
3. 之后到达的 `user/message`：`source.kind === 'subagent-settled'`，`source.summary` 说明结束方式，文本块依次是摘要行、`Its closing message:` 或 `It left no closing message.`、子任务最终文本、可选的 `Structured result: ...` 与诊断信息。

宿主侧把这些事件折叠成 `externalTaskContexts` 投影；客户端只读取该投影并渲染。

## Known limitations

外部提供方（Claude Code、Codex、ACP）在独立进程中运行；DSH 不会持久化它们的内部步骤和工具调用记录，外部子任务也没有本地 Session 或 transcript。因此本插件**只能**展示委派上下文与返回结果，无法展示外部 Agent 的私有上下文、内部推理或完整工具调用链。

在 DSH `0.2.1-rc.2` 中，Claude Code 提供方使用 `persistSession: false`，其进程内会话不会留存。

另外：

- 标签匹配只在能够唯一确定时进行：优先使用目录标签匹配最早的未配对调用；没有标签匹配且恰好只有一个未配对调用时才采用它；存在多个候选时不猜测，提示词和选项保持缺失。
- 只保留最近 20 个尚未与目录条目配对的委派调用。
- Fork 继承的历史事件（`seq < inheritedEventCount`）不会被归属到当前会话。

## Installation

要求 DSH `0.2.2-alpha.2` 或更高版本，Node `^22.19 || >=24`。

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

## Usage

1. 在会话中让模型通过外部子任务工具委派工作（例如 Claude Code、Codex、ACP）。
2. 委派调用出现后，标题栏出现「外部任务」按钮；点击打开右侧栏面板。
3. 在左侧选择任务，查看其提示词、运行上下文与返回结果。

## Privacy

投影会随会话投影缓存一起持久化。提示词和返回内容因此会在会话日志之外再保存一份（内容本身已经存在于会话日志中）。请在共享环境或导出会话时按同样的敏感度处理这些数据。
