# dsh-external-task-context-patch

DSH 官方发行版 `0.2.2-rc.1` 中的 `@deepseek-ai/dsh-subagent-claude-code` 不会写运行日志，而外部任务上下文插件依赖这些日志提供实时对话流与「统计」标签。本包在官方提供方源码上应用插件的运行日志补丁并重新构建，然后安装到现有的 DSH profile 中。

未打补丁时，插件仍能展示委派提示词、运行上下文和返回结果，但 Claude Code 任务没有实时日志，也没有统计。

## 支持的版本

| 提供方版本 | deepseek-harness tag |
| --- | --- |
| `0.2.2-rc.1` | `dsh-v0.2.2-rc.1`（默认） |

安装器按 `dsh-v<version>` 建立版本与 tag 的映射；若 profile 中已安装的提供方版本与 `--tag` 不一致，除非传入 `--force`，否则拒绝安装。

## 使用

```sh
# 未发布到 npm 时，从插件根目录直接运行（推荐先 --dry-run）。
node patch/install.mjs --profile desktop --dry-run
node patch/install.mjs --profile desktop

# 已发布后可用 npx。
# Patch the only profile that has the provider installed.
npx @lifenrir/dsh-external-task-context-patch

# 指定 profile（可重复传入 --profile 处理多个）。
npx @lifenrir/dsh-external-task-context-patch --profile desktop

# 只下载和构建，不写入 profile；临时文件除外。
npx @lifenrir/dsh-external-task-context-patch --profile desktop --dry-run

# 恢复该 profile 最新的备份。
npx @lifenrir/dsh-external-task-context-patch --profile desktop --restore

# 使用本地 deepseek-harness 检出，不访问网络。
npx @lifenrir/dsh-external-task-context-patch --profile desktop \
  --source /path/to/deepseek-harness/packages/subagent/subagent-claude-code/src
```

其他选项：

- `--dsh-home <path>`：DSH home。默认使用非空的 `$DSH_HOME`，否则 `~/.dsh`。
- `--tag <git-tag>`：要下载的发行 tag，默认 `dsh-v0.2.2-rc.1`。
- `--force`：在版本与 tag 不匹配，或同一 tag 已存在有效安装记录时仍继续安装，并打印醒目警告。
- `--yes`：非交互地处理所有发现的 profile。不传时，发现结果必须恰好只有一个 profile。
- `--source <dir>`：离线模式。目录中必须包含官方 `index.ts`、`run.ts`、`process.ts`。

未指定 `--profile` 时，安装器查找
`<dsh-home>/profiles/*/node_modules/@deepseek-ai/dsh-subagent-claude-code`。
必须恰好匹配一个 profile；传入 `--yes` 时处理全部匹配项。

每次运行都会打印 profile、提供方版本、tag、备份路径、日志目录
（`<dsh-home>/logs/subagent-claude-code`）以及重启提醒。

## 安装器改动的文件

只替换提供方包中的一个文件：

```
<profile>/node_modules/@deepseek-ai/dsh-subagent-claude-code/lib/index.js
```

下载的官方 `process.ts` 保持不变；补丁版 `index.ts`、`run.ts`、`log.ts` 由 esbuild 与其一起打包（单个 ESM bundle、`packages: 'external'`、`platform: 'node'`、`target: 'node20'`）。补丁版 `log.ts` 内联解析 DSH home（`$DSH_HOME` 非空时优先，否则 `~/.dsh`），因此 bundle 不再依赖 `@deepseek-ai/dsh-home-paths`。

安装器不修改 profile 的 `package.json`，不运行 `pnpm`，也不改动其他已安装文件。

## 备份与恢复

替换 `lib/index.js` 之前，原文件会被复制到：

```
<dsh-home>/backups/subagent-claude-code-patch/<UTC 时间戳>/<profile>/index.js
<dsh-home>/backups/subagent-claude-code-patch/<UTC 时间戳>/<profile>/install.json
```

`install.json` 记录 `{ version, tag, installedAt, providerDir, backupFile }`。
`--restore` 会把最新记录的备份复制回 `lib/index.js`，并写入 `restoredAt`；再次恢复是无操作。

替换文件后，安装器会从提供方真实目录导入已安装的 bundle，检查
`name === 'subagent-claude-code'` 且 `Config({}).persistNativeTranscript === true`。
检查失败时会自动还原备份并以非零状态退出。

## 重启

DSH 在启动时加载提供方。安装或恢复后需要重启 DSH；在此之前旧模块仍然驻留。

## 升级

升级 DSH 或提供方会替换包内容，从而覆盖 `lib/index.js` 并移除补丁。升级后请按新版本和 tag 重新运行安装器。建议先使用 `--dry-run`；版本与 tag 不一致时必须加 `--force`。

## 网络与代理

源码从
`https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/<tag>/packages/subagent/subagent-claude-code/src/`
下载，每个文件 30 秒超时。若 DSH 位于代理之后，请在运行安装器前设置
`NODE_USE_ENV_PROXY=1` 与 `HTTPS_PROXY`（或 `HTTP_PROXY`），或使用
`--source <dir>` 指向本地检出。

## 测试

```sh
node --test tests/lib.test.mjs
```
