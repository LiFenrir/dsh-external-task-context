/**
 * Per-run Claude Code execution logs: an append-only JSONL message stream and
 * a rewritten metadata sidecar. Logging is best effort: every failure is
 * reported to the supplied sink and never reaches the run.
 *
 * @module @deepseek-ai/dsh-subagent-claude-code/log
 */

import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  type WriteStream,
} from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'

/** Default number of days a finished run log is retained. */
export const DEFAULT_LOG_RETENTION_DAYS = 7

/** Milliseconds in one day, used by retention cleanup. */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000

/** Terminal status recorded for a finished run. */
export type RunLogStatus = 'completed' | 'failed' | 'cancelled'

/** Metadata sidecar status, which is `running` until the run terminates. */
type MetaStatus = 'running' | RunLogStatus

/** Facts needed to open one run's logs. */
export interface RunLogWriterOptions {
  /** Directory that receives the JSONL and metadata files. */
  readonly directory: string
  /** Run identity, also the file stem used by both files. */
  readonly runId: string
  /** Child working directory recorded in the start line and metadata. */
  readonly cwd: string
  /** Selected native model, or null when native settings choose it. */
  readonly model?: string | null
  /** Run start time; defaults to the writer creation time. */
  readonly startedAt?: number
  /** Sink for swallowed logging failures. */
  readonly onError?: (error: Error) => void
}

/** Append-only writer for one run's execution log. */
export interface RunLogWriter {
  /** Append one raw SDK message. */
  message(message: SDKMessage): void
  /** Append the terminal record and rewrite the metadata sidecar. */
  finish(status: RunLogStatus, result?: string | null): void
  /** Stop accepting records and release the JSONL stream. */
  close(): void
}

/** Shape of the rewritten metadata sidecar. */
interface MetaFile {
  readonly runId: string
  readonly cwd: string
  readonly model: string | null
  readonly startedAt: number
  readonly endedAt?: number
  readonly status: MetaStatus
  readonly claudeSessionId?: string
  readonly claudeConfigDir: string
}

/**
 * Resolve the DeepSeek Harness home directory.
 *
 * Inlined from `@deepseek-ai/dsh-home-paths` so the patched bundle has no
 * dependency on that package, which the official provider does not ship.
 * @returns `$DSH_HOME` when set and non-empty, otherwise `<os home>/.dsh`.
 */
function resolveDshHome(): string {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.trim().length > 0
    ? resolve(configured)
    : join(homedir(), '.dsh')
}

/**
 * Default log directory under the resolved DeepSeek Harness home.
 * @returns `<DSH_HOME>/logs/subagent-claude-code`, resolved when called.
 */
export function defaultRunLogDirectory(): string {
  return join(resolveDshHome(), 'logs', 'subagent-claude-code')
}

/**
 * Resolve Claude Code's native configuration root.
 * @returns `$CLAUDE_CONFIG_DIR` when set and non-empty, otherwise `<os home>/.claude`.
 */
function resolveClaudeConfigDir(): string {
  const configured = process.env.CLAUDE_CONFIG_DIR
  return configured !== undefined && configured.trim().length > 0
    ? resolve(configured)
    : join(homedir(), '.claude')
}

/** Whether a directory entry carries one of the two run-log file names. */
function isRunLogFile(name: string): boolean {
  return name.endsWith('.jsonl') || name.endsWith('.meta.json')
}

/**
 * Delete run-log files older than the retention window.
 * @param directory - log directory to scan; absence and unreadable entries are ignored.
 * @param retentionDays - maximum file age in days.
 */
export function cleanupExpiredRunLogs(directory: string, retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * MILLISECONDS_PER_DAY
  let names: string[]
  try {
    names = readdirSync(directory)
  } catch {
    // A missing or unreadable directory leaves nothing to clean.
    return
  }
  for (const name of names) {
    if (!isRunLogFile(name)) continue
    const path = join(directory, name)
    try {
      if (statSync(path).mtimeMs < cutoff) rmSync(path, { force: true })
    } catch {
      // A concurrent run may have removed or replaced the entry.
    }
  }
}

/**
 * Create the best-effort writer for one run.
 * @param options - directory, run identity, and metadata facts.
 * @returns a writer that swallows every logging failure through `options.onError`.
 */
export function createRunLogWriter(options: RunLogWriterOptions): RunLogWriter {
  const report = (error: unknown): void => {
    try {
      options.onError?.(error instanceof Error ? error : new Error(String(error)))
    } catch {
      // The diagnostic sink cannot break the log writer.
    }
  }

  const jsonlPath = join(options.directory, `${options.runId}.jsonl`)
  const metaPath = join(options.directory, `${options.runId}.meta.json`)
  const startedAt = options.startedAt ?? Date.now()
  let sessionId: string | undefined
  let status: MetaStatus = 'running'
  let endedAt: number | undefined
  let finished = false
  let closed = false

  const writeMeta = (): void => {
    const meta: MetaFile = {
      runId: options.runId,
      cwd: options.cwd,
      model: options.model ?? null,
      startedAt,
      status,
      claudeConfigDir: resolveClaudeConfigDir(),
      ...endedAt === undefined ? {} : { endedAt },
      ...sessionId === undefined ? {} : { claudeSessionId: sessionId },
    }
    try {
      writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      })
    } catch (error) {
      report(error)
    }
  }

  let stream: WriteStream
  try {
    mkdirSync(options.directory, { recursive: true, mode: 0o700 })
    stream = createWriteStream(jsonlPath, { flags: 'a', mode: 0o600 })
    stream.on('error', report)
  } catch (error) {
    report(error)
    return { message() {}, finish() {}, close() {} }
  }

  const writeLine = (record: object): void => {
    if (closed) return
    try {
      stream.write(`${JSON.stringify(record)}\n`)
    } catch (error) {
      report(error)
    }
  }

  writeLine({
    kind: 'start',
    time: startedAt,
    runId: options.runId,
    cwd: options.cwd,
    model: options.model ?? null,
  })
  writeMeta()

  return {
    message(message: SDKMessage): void {
      if (finished || closed) return
      const incoming = message.session_id
      if (sessionId === undefined && typeof incoming === 'string' && incoming.length > 0) {
        sessionId = incoming
        writeMeta()
      }
      writeLine({ kind: 'message', time: Date.now(), message })
    },
    finish(next: RunLogStatus, result: string | null = null): void {
      if (finished || closed) return
      finished = true
      status = next
      endedAt = Date.now()
      writeLine({ kind: 'end', time: endedAt, status: next, result })
      writeMeta()
    },
    close(): void {
      if (closed) return
      closed = true
      try {
        stream.end()
      } catch (error) {
        report(error)
      }
    },
  }
}
