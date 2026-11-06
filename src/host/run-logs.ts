/**
 * Raw log readers for Claude Code external runs.
 *
 * A run has two independent traces written by the provider:
 * - `dsh`: `<log dir>/<runId>.jsonl`, one provider-neutral JSON record per line;
 * - `native`: Claude Code's own transcript, located through
 *   `<log dir>/<runId>.meta.json` and
 *   `<claudeConfigDir>/projects/<project>/<session>.jsonl`.
 *
 * Only complete, newline-terminated UTF-8 lines are handed out, so a caller can
 * tail a growing file by advancing `nextOffset`. Every failure is a
 * {@link RunLogError} with a stable code; file contents are never logged.
 */
import { promises as fs } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

/** Producer of a run trace. */
export type RunLogSource = 'dsh' | 'native'

/** Stable failure codes mapped to HTTP statuses by the host route. */
export type RunLogErrorCode =
  | 'invalid-request'
  | 'log-not-found'
  | 'transcript-not-found'
  | 'read-failed'

/** One incremental read result: complete lines plus the next cursor. */
export interface RunLogChunk {
  content: string
  nextOffset: number
}

/** Typed failure carrying the code the route maps to an HTTP status. */
export class RunLogError extends Error {
  readonly code: RunLogErrorCode

  /**
   * @param code - stable failure code.
   * @param message - user-facing explanation without file contents.
   */
  constructor(code: RunLogErrorCode, message: string) {
    super(message)
    this.name = 'RunLogError'
    this.code = code
  }
}

/** Lowercase UUID form accepted as a run id (the task's catalog childId). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** Upper bound for one incremental read. */
const MAX_READ_BYTES = 512 * 1024

/** True when `value` is the strict lowercase UUID form accepted as a run id. */
export function isRunLogId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/** True when `value` names a supported trace source. */
export function isRunLogSource(value: unknown): value is RunLogSource {
  return value === 'dsh' || value === 'native'
}

/**
 * Resolve the provider log directory.
 *
 * `DSH_HOME` wins when it is set and non-empty; otherwise the conventional
 * `<home>/.dsh` root is used.
 */
export function resolveRunLogDir(): string {
  const configured = process.env.DSH_HOME?.trim()
  const home = configured !== undefined && configured.length > 0
    ? configured
    : join(homedir(), '.dsh')
  return join(home, 'logs', 'subagent-claude-code')
}

/**
 * Read complete lines from one run trace starting at `offset`.
 *
 * At most 512 KiB are inspected per call. A trailing partial line is left for
 * a later call (its bytes stay before `nextOffset`); when the file ends exactly
 * at the offset the content is empty and `nextOffset` is the current size.
 *
 * @param childId - provider run id (lowercase UUID).
 * @param source - trace to read, defaulting to the provider-neutral `dsh` log.
 * @param offset - byte offset of the first unread byte.
 * @returns the complete newline-terminated lines and the next byte offset.
 * @throws {RunLogError} `invalid-request`, `log-not-found`,
 * `transcript-not-found`, or `read-failed`.
 */
export async function readRunLog(
  childId: string,
  source: RunLogSource = 'dsh',
  offset = 0,
): Promise<RunLogChunk> {
  if (!isRunLogId(childId)) {
    throw new RunLogError('invalid-request', 'childId must be a lowercase UUID.')
  }
  if (!isRunLogSource(source)) {
    throw new RunLogError('invalid-request', 'source must be "dsh" or "native".')
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RunLogError('invalid-request', 'offset must be a non-negative integer.')
  }

  const directory = resolveRunLogDir()
  if (source === 'dsh') {
    const file = containedPath(directory, `${childId}.jsonl`)
    return readLines(file, offset, () => new RunLogError(
      'log-not-found',
      'No DSH log was found for this task.',
    ))
  }

  const file = await resolveNativeTranscript(directory, childId)
  return readLines(file, offset, () => transcriptNotFound())
}

/** Read one trace increment, translating filesystem failures to typed errors. */
async function readLines(
  file: string,
  offset: number,
  notFound: () => RunLogError,
): Promise<RunLogChunk> {
  let handle: FileHandle
  try {
    handle = await fs.open(file, 'r')
  } catch (error) {
    if (isErrno(error, 'ENOENT')) throw notFound()
    throw new RunLogError('read-failed', 'The log file could not be opened.')
  }

  try {
    const stat = await handle.stat()
    if (!stat.isFile()) throw notFound()
    const size = stat.size
    // A truncated or rotated file cannot satisfy the old cursor; resume at the
    // new end instead of replaying bytes the caller already consumed.
    const start = offset > size ? size : offset
    if (start >= size) return { content: '', nextOffset: size }

    const length = Math.min(MAX_READ_BYTES, size - start)
    const buffer = Buffer.allocUnsafe(length)
    const { bytesRead } = await handle.read(buffer, 0, length, start)
    if (bytesRead === 0) return { content: '', nextOffset: start }

    const lastNewline = buffer.lastIndexOf(0x0a, bytesRead - 1)
    if (lastNewline < 0) {
      // The remaining bytes end inside a line; leave them for the next call.
      return { content: '', nextOffset: start }
    }
    return {
      content: buffer.subarray(0, lastNewline + 1).toString('utf8'),
      nextOffset: start + lastNewline + 1,
    }
  } catch (error) {
    if (error instanceof RunLogError) throw error
    throw new RunLogError('read-failed', 'The log file could not be read.')
  } finally {
    await handle.close().catch(() => {})
  }
}

/** Locate the native transcript named by the run's metadata sidecar. */
async function resolveNativeTranscript(directory: string, childId: string): Promise<string> {
  const metaPath = containedPath(directory, `${childId}.meta.json`)

  let raw: string
  try {
    raw = await fs.readFile(metaPath, 'utf8')
  } catch (error) {
    if (isErrno(error, 'ENOENT')) throw transcriptNotFound()
    throw new RunLogError('read-failed', 'The run metadata could not be read.')
  }

  let meta: unknown
  try {
    meta = JSON.parse(raw)
  } catch {
    throw transcriptNotFound()
  }
  if (!isRecord(meta)) throw transcriptNotFound()

  const sessionId = meta.claudeSessionId
  const configDir = meta.claudeConfigDir
  // The session id becomes a file name and the config dir a search root;
  // reject malformed metadata before touching either of them. A session id is
  // only required to be a non-empty name, never a path fragment.
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw transcriptNotFound()
  if (/[/\\\0]/.test(sessionId)) throw transcriptNotFound()
  if (typeof configDir !== 'string' || configDir.length === 0) throw transcriptNotFound()

  const projectsDir = resolve(configDir, 'projects')
  let projectNames: string[]
  try {
    projectNames = await fs.readdir(projectsDir)
  } catch (error) {
    if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) throw transcriptNotFound()
    throw new RunLogError('read-failed', 'The Claude projects directory could not be read.')
  }

  // Claude Code groups transcripts by project; the session id is unique, so
  // the first matching regular file is the transcript regardless of group.
  projectNames.sort()
  for (const projectName of projectNames) {
    const candidate = resolve(projectsDir, projectName, `${sessionId}.jsonl`)
    if (!isWithin(projectsDir, candidate)) continue
    try {
      const stat = await fs.stat(candidate)
      if (stat.isFile()) return candidate
    } catch (error) {
      if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) continue
      throw new RunLogError('read-failed', 'The Claude transcript could not be inspected.')
    }
  }

  throw transcriptNotFound()
}

function transcriptNotFound(): RunLogError {
  return new RunLogError(
    'transcript-not-found',
    'No native Claude transcript was found for this task.',
  )
}

/** Resolve one child path and reject anything escaping its root. */
function containedPath(root: string, name: string): string {
  const base = resolve(root)
  const candidate = resolve(base, name)
  if (!isWithin(base, candidate)) {
    throw new RunLogError('invalid-request', 'The requested path is outside the allowed directory.')
  }
  return candidate
}

/** Whether `candidate` resolves at or below `root`. */
function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate)
  return path.length === 0
    || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isErrno(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && (error as { code?: unknown }).code === code
}
