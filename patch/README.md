# dsh-external-task-context-patch

The official DSH release `0.2.2-rc.1` ships `@deepseek-ai/dsh-subagent-claude-code`
as a package whose provider does not write run logs. The External Task Context
plugin needs those logs for its live conversation stream and its Statistics tab.
This package rebuilds the official provider with the plugin's run-log patch and
installs it into an existing DSH profile.

Without the patch the plugin still shows the delegation prompt, the runtime
context, and the returned outcome, but there is no live log and no statistics
for Claude Code tasks.

## Supported release

| Provider version | deepseek-harness tag |
| --- | --- |
| `0.2.2-rc.1` | `dsh-v0.2.2-rc.1` (default) |

The installer maps `version` to `dsh-v<version>` and refuses a profile whose
installed provider version does not match `--tag` unless `--force` is passed.

## Usage

```sh
# Before publishing to npm, run it from the plugin root (prefer --dry-run first).
node patch/install.mjs --profile desktop --dry-run
node patch/install.mjs --profile desktop

# Once published, the npx shortcut works.
# Patch the only profile that has the provider installed.
npx @lifenrir/dsh-external-task-context-patch

# Patch a named profile (repeat --profile for several).
npx @lifenrir/dsh-external-task-context-patch --profile desktop

# Show what would happen; downloads and builds, but writes only temp files.
npx @lifenrir/dsh-external-task-context-patch --profile desktop --dry-run

# Restore the newest backup for the profile.
npx @lifenrir/dsh-external-task-context-patch --profile desktop --restore

# Build from a local deepseek-harness checkout instead of GitHub.
npx @lifenrir/dsh-external-task-context-patch --profile desktop \
  --source /path/to/deepseek-harness/packages/subagent/subagent-claude-code/src
```

Other options:

- `--dsh-home <path>`: DSH home. Defaults to a non-empty `$DSH_HOME`, then `~/.dsh`.
- `--tag <git-tag>`: release tag to download. Defaults to `dsh-v0.2.2-rc.1`.
- `--force`: install despite a provider-version/tag mismatch, or reinstall over an
  existing active patch record for the same tag. A loud warning is printed.
- `--yes`: process every discovered profile non-interactively. Without it,
  discovery must find exactly one profile.
- `--source <dir>`: offline mode. The directory must contain the official
  `index.ts`, `run.ts`, and `process.ts`.

When no `--profile` is given the installer looks for
`<dsh-home>/profiles/*/node_modules/@deepseek-ai/dsh-subagent-claude-code`.
Exactly one match is required unless `--yes` is passed, in which case all
matches are patched.

Each run prints the profile, the provider version, the tag, the backup path, the
log directory (`<dsh-home>/logs/subagent-claude-code`), and a restart reminder.

## What the installer changes

It replaces exactly one file in the provider package:

```
<profile>/node_modules/@deepseek-ai/dsh-subagent-claude-code/lib/index.js
```

The downloaded official `process.ts` is kept; the patched `index.ts`, `run.ts`,
and `log.ts` are bundled over it with esbuild (single ESM bundle,
`packages: 'external'`, `platform: 'node'`, `target: 'node20'`). The patched
`log.ts` resolves the DSH home inline (`$DSH_HOME` when non-empty, otherwise
`~/.dsh`), so the bundle has no `@deepseek-ai/dsh-home-paths` dependency.

The installer does not modify the profile's `package.json`, does not run `pnpm`,
and does not touch any other installed file.

## Backups and restore

Before replacing `lib/index.js`, the original is copied to:

```
<dsh-home>/backups/subagent-claude-code-patch/<UTC timestamp>/<profile>/index.js
<dsh-home>/backups/subagent-claude-code-patch/<UTC timestamp>/<profile>/install.json
```

`install.json` records `{ version, tag, installedAt, providerDir, backupFile }`.
`--restore` copies the newest record's backup back over `lib/index.js` and marks
the record with `restoredAt`; restoring again is a no-op.

After replacing the file, the installer imports the installed bundle and checks
that `name === 'subagent-claude-code'` and that
`Config({}).persistNativeTranscript === true`. If that check fails, the backup is
restored automatically and the command exits non-zero.

## Restart

DSH loads the provider at startup. Restart DSH after installing or restoring.
Until then the old module stays loaded.

## Upgrades

A DSH or provider upgrade replaces the package contents, which overwrites
`lib/index.js` and removes the patch. After any upgrade, re-run the installer
for the new version and tag. Use `--dry-run` first; `--force` is required when
the version and tag do not match.

## Network and proxies

Sources are downloaded from
`https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/<tag>/packages/subagent/subagent-claude-code/src/`
with a 30-second timeout per file. If DSH runs behind a proxy, set
`NODE_USE_ENV_PROXY=1` and `HTTPS_PROXY` (or `HTTP_PROXY`) before running the
installer, or use `--source <dir>` with a local checkout.

## Tests

```sh
node --test tests/lib.test.mjs
```
