/**
 * Pure Markdown/structured renderer for the Claude Code run trace.
 *
 * The stream pane feeds each newly read chunk of the DSH log to
 * {@link dshLogToMarkdown} and appends the returned blocks. The function is
 * total: malformed JSON, unknown record types, and missing fields are skipped,
 * never thrown.
 *
 * Blocks carry a kind plus presentation hints. Assistant prose renders open;
 * thinking, tool calls, and tool results collapse behind a summary; Write/Edit
 * style calls expose a structured {@link FileChange} diff instead of raw JSON.
 */
/** Longest Markdown kept from one rendered block. */
export const MAX_BLOCK_CHARS = 8000

/** Longest thinking text kept in one collapsed block. */
export const MAX_THINKING_CHARS = 4000

/** Longest one-line tool argument summary. */
export const MAX_SUMMARY_CHARS = 120

/** Marker appended when one rendered entry is cut. */
export const TRUNCATION_NOTE = '… [truncated]'

/** Changed-hunk budget of an Edit diff before the middle collapses. */
const EDIT_HUNK_LIMIT = 30

/** Context lines kept on each side of an Edit hunk. */
const EDIT_CONTEXT_LINES = 2

/** Write content is head/tail truncated beyond this line count. */
const WRITE_LINE_LIMIT = 40

/** Lines kept from the head/tail of a long Write. */
const WRITE_HEAD_LINES = 10
const WRITE_TAIL_LINES = 2

/** Visual class of one rendered block. */
export type MarkdownBlockKind =
  | 'meta'
  | 'assistantText'
  | 'thinking'
  | 'tool'
  | 'toolResult'
  | 'fileChange'
  | 'result'
  | 'error'

/** One line of a structured file diff. */
export interface DiffLine {
  readonly kind: 'add' | 'del' | 'context'
  readonly text: string
}

/** Structured change of one Write/Edit-style tool call. */
export interface FileChange {
  readonly path?: string
  readonly tool: string
  readonly lines: readonly DiffLine[]
  readonly truncated: boolean
}

/** One rendered block of the streamed log. */
export interface MarkdownBlock {
  readonly kind: MarkdownBlockKind
  /** Collapsed summary line (thinking/tool/toolResult). */
  readonly title?: string
  readonly markdown: string
  readonly collapsible?: boolean
  readonly defaultOpen?: boolean
  /** Present for Write/Edit-style tools. */
  readonly change?: FileChange
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Cut one rendered entry at `budget` and mark the cut. */
function bound(text: string, budget: number = MAX_BLOCK_CHARS): string {
  if (text.length <= budget) return text
  const note = `\n${TRUNCATION_NOTE}`
  return `${text.slice(0, Math.max(0, budget - note.length))}${note}`
}

/** Cut a one-line summary without adding a newline. */
function short(text: string): string {
  return text.length <= MAX_SUMMARY_CHARS
    ? text
    : `${text.slice(0, MAX_SUMMARY_CHARS - 1)}…`
}

/**
 * Fence `content`, reserving room for the fence and its closing marker.
 */
function fence(language: string, content: string): string {
  const open = '```' + language + '\n'
  const close = '\n```'
  const budget = MAX_BLOCK_CHARS - open.length - close.length
  return open + bound(content, Math.max(0, budget)) + close
}

/** Quote every line so thinking renders as an aside. */
function quote(text: string): string {
  return text.split(/\r?\n/).map(line => `> ${line}`).join('\n')
}

/** Pretty JSON for tool arguments; non-serializable values render as `{}`. */
function jsonText(value: unknown): string {
  if (value === undefined) return '{}'
  try {
    return JSON.stringify(value, null, 2) ?? '{}'
  } catch {
    return '{}'
  }
}

/** Flatten a tool-result payload: a string or text content blocks. */
function outputText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (typeof block === 'string') parts.push(block)
    else if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n')
}

/** Split a text value into physical lines, dropping one trailing newline. */
function splitLines(value: string): string[] {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

function changedLine(line: string, kind: 'add' | 'del'): DiffLine {
  return { kind, text: line }
}

function contextLine(line: string): DiffLine {
  return { kind: 'context', text: line }
}

interface DiffResult {
  readonly lines: DiffLine[]
  readonly truncated: boolean
}

/**
 * Line diff of one old/new pair: common prefix and suffix become context,
 * removed and added lines form the hunk. Only {@link EDIT_CONTEXT_LINES}
 * context lines survive on each side; a hunk longer than
 * {@link EDIT_HUNK_LIMIT} keeps its first and last two changed lines.
 */
function diffLines(oldText: string, newText: string): DiffResult {
  const before = splitLines(oldText)
  const after = splitLines(newText)

  let prefix = 0
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix += 1
  }
  let suffix = 0
  while (
    suffix < before.length - prefix
    && suffix < after.length - prefix
    && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const removed = before.slice(prefix, before.length - suffix)
  const added = after.slice(prefix, after.length - suffix)
  if (removed.length === 0 && added.length === 0) return { lines: [], truncated: false }

  const changed: DiffLine[] = [
    ...removed.map(line => changedLine(line, 'del')),
    ...added.map(line => changedLine(line, 'add')),
  ]
  const lead = before.slice(Math.max(0, prefix - EDIT_CONTEXT_LINES), prefix)
  const trail = before.slice(before.length - suffix, before.length - suffix + EDIT_CONTEXT_LINES)

  let body: DiffLine[]
  let truncated = false
  if (changed.length > EDIT_HUNK_LIMIT) {
    body = [
      ...changed.slice(0, 2),
      contextLine(TRUNCATION_NOTE),
      ...changed.slice(-2),
    ]
    truncated = true
  } else {
    body = changed
  }

  return {
    lines: [...lead.map(contextLine), ...body, ...trail.map(contextLine)],
    truncated,
  }
}

/** Render one Write call's content as added lines. */
function writeChange(content: string): DiffResult {
  const lines = splitLines(content)
  if (lines.length > WRITE_LINE_LIMIT) {
    return {
      lines: [
        ...lines.slice(0, WRITE_HEAD_LINES).map(line => changedLine(line, 'add')),
        contextLine(TRUNCATION_NOTE),
        ...lines.slice(-WRITE_TAIL_LINES).map(line => changedLine(line, 'add')),
      ],
      truncated: true,
    }
  }
  return { lines: lines.map(line => changedLine(line, 'add')), truncated: false }
}

/** Render a MultiEdit call's per-edit diffs, separated by a marker line. */
function multiEditChange(
  edits: readonly unknown[],
  base: Omit<FileChange, 'lines' | 'truncated'>,
): FileChange {
  const lines: DiffLine[] = []
  let truncated = false
  edits.forEach((entry, index) => {
    if (!isRecord(entry)) return
    const oldText = typeof entry.old_string === 'string' ? entry.old_string : ''
    const newText = typeof entry.new_string === 'string' ? entry.new_string : ''
    if (lines.length > 0) lines.push(contextLine(`── edit ${index + 1} ──`))
    const diff = diffLines(oldText, newText)
    lines.push(...diff.lines)
    truncated = truncated || diff.truncated
  })
  return { ...base, lines, truncated }
}

const WRITE_TOOLS = new Set(['write', 'edit', 'multiedit', 'notebookedit'])

function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name.toLowerCase())
}

/** `file_path` / `path` / `notebook_path` of a tool input. */
function changePath(input: Record<string, unknown>): string | undefined {
  return nonEmptyString(input.file_path)
    ?? nonEmptyString(input.path)
    ?? nonEmptyString(input.notebook_path)
}

/** Build the structured change for a Write/Edit-style tool call. */
function fileChangeBlock(
  name: string,
  input: Record<string, unknown>,
  path: string | undefined,
): MarkdownBlock {
  const base = { path, tool: name }
  let result: DiffResult

  if (Array.isArray(input.edits)) {
    const change = multiEditChange(input.edits, base)
    return {
      kind: 'fileChange',
      title: `→ ${name}${path !== undefined ? ` ${path}` : ''}`,
      markdown: '',
      change,
    }
  }

  if (typeof input.content === 'string') {
    result = writeChange(input.content)
  } else if (typeof input.old_string === 'string' || typeof input.new_string === 'string') {
    result = diffLines(
      typeof input.old_string === 'string' ? input.old_string : '',
      typeof input.new_string === 'string' ? input.new_string : '',
    )
  } else if (typeof input.new_source === 'string') {
    // NotebookEdit writes a cell body rather than a file body.
    result = writeChange(input.new_source)
  } else {
    result = { lines: [], truncated: false }
  }

  return {
    kind: 'fileChange',
    title: `→ ${name}${path !== undefined ? ` ${path}` : ''}`,
    markdown: '',
    change: { ...base, lines: result.lines, truncated: result.truncated },
  }
}

/** First usable argument value for a one-line tool summary. */
function toolSummary(input: Record<string, unknown>): string {
  const candidates = [
    input.description,
    input.command,
    input.file_path,
    input.path,
    input.pattern,
    input.query,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return short(value)
  }
  return ''
}

function block(kind: MarkdownBlockKind, markdown: string): MarkdownBlock {
  return { kind, markdown }
}

/** Render one assistant content entry. */
function assistantEntry(
  entry: Record<string, unknown>,
  result: MarkdownBlock[],
): void {
  switch (entry.type) {
    case 'text': {
      const text = nonEmptyString(entry.text)
      if (text !== undefined) result.push(block('assistantText', text))
      break
    }
    case 'thinking': {
      const thinking = nonEmptyString(entry.thinking)
      if (thinking !== undefined) {
        result.push({
          kind: 'thinking',
          title: '思考',
          markdown: bound(quote(thinking), MAX_THINKING_CHARS),
          collapsible: true,
          defaultOpen: false,
        })
      }
      break
    }
    case 'tool_use': {
      const name = nonEmptyString(entry.name) ?? 'tool'
      const source = entry.input ?? entry.arguments
      const input = isRecord(source) ? source : {}
      if (isWriteTool(name)) {
        result.push(fileChangeBlock(name, input, changePath(input)))
        break
      }
      const summary = toolSummary(input)
      result.push({
        kind: 'tool',
        title: `→ ${name}${summary.length > 0 ? ` · ${summary}` : ''}`,
        markdown: fence('json', jsonText(source)),
        collapsible: true,
        defaultOpen: false,
      })
      break
    }
    default: break
  }
}

/** Render assistant content blocks (text, thinking, tool_use). */
function assistantBlocks(content: unknown): MarkdownBlock[] {
  if (typeof content === 'string') {
    return content.length > 0 ? [block('assistantText', content)] : []
  }
  if (!Array.isArray(content)) return []

  const result: MarkdownBlock[] = []
  for (const entry of content) {
    if (isRecord(entry)) assistantEntry(entry, result)
  }
  return result
}

/** Render user content blocks (text, tool_result). */
function userBlocks(content: unknown): MarkdownBlock[] {
  if (typeof content === 'string') {
    return content.length > 0 ? [block('meta', bound(`> ${content}`))] : []
  }
  if (!Array.isArray(content)) return []

  const result: MarkdownBlock[] = []
  for (const entry of content) {
    if (!isRecord(entry)) continue
    switch (entry.type) {
      case 'text': {
        const text = nonEmptyString(entry.text)
        if (text !== undefined) result.push(block('meta', bound(`> ${text}`)))
        break
      }
      case 'tool_result': {
        const output = outputText(entry.content)
        result.push({
          kind: 'toolResult',
          title: '← 结果',
          markdown: fence('text', output),
          collapsible: true,
          defaultOpen: false,
        })
        break
      }
      default: break
    }
  }
  return result
}

/**
 * Raw SDK message content.
 *
 * `SDKAssistantMessage`/`SDKUserMessage` wrap the API message, so content lives
 * at `message.message.content`; hand-built fixtures keep it flat at
 * `message.content`.
 */
function sdkContent(message: Record<string, unknown>): unknown {
  const nested = message.message
  if (isRecord(nested) && 'content' in nested) return nested.content
  return message.content
}

/** Render the SDK result record as one summary block. */
function resultBlock(message: Record<string, unknown>): MarkdownBlock {
  const status = nonEmptyString(message.subtype)
    ?? (message.is_error === true ? 'error' : 'success')
  const turns = finiteNumber(message.num_turns)
  const cost = finiteNumber(message.total_cost_usd) ?? finiteNumber(message.cost_usd)
  const duration = finiteNumber(message.duration_ms)
  const parts = [
    `✔ ${status}`,
    `${turns !== undefined ? turns : '—'} turns`,
    `$${cost !== undefined ? cost : '—'}`,
    duration !== undefined ? `${duration}ms` : '—',
  ]
  return block('result', bound(`> ${parts.join(' · ')}`))
}

/** Render an `error` record, keeping its message when present. */
function errorBlock(entry: Record<string, unknown>): MarkdownBlock {
  const text = nonEmptyString(entry.message)
    ?? nonEmptyString(entry.error)
    ?? 'error'
  return block('error', bound(`> ⚠ ${text}`))
}

/**
 * Parse the provider-neutral `<runId>.jsonl` trace into blocks.
 *
 * @param text - newly read complete lines of the trace.
 * @returns blocks in source order.
 */
export function dshLogToMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length === 0) continue
    let entry: unknown
    try {
      entry = JSON.parse(raw)
    } catch {
      continue
    }
    if (!isRecord(entry)) continue

    if (entry.kind === 'start') {
      const cwd = nonEmptyString(entry.cwd) ?? '—'
      const model = nonEmptyString(entry.model) ?? '—'
      blocks.push(block('meta', bound(`> ▶ 会话开始 · cwd: ${cwd} · model: ${model}`)))
      continue
    }
    if (entry.kind === 'end') {
      const status = nonEmptyString(entry.status) ?? 'unknown'
      blocks.push(block('meta', bound(`> ■ ${status}`)))
      continue
    }
    if (entry.kind === 'error') {
      blocks.push(errorBlock(entry))
      continue
    }
    if (entry.kind !== 'message' || !isRecord(entry.message)) continue

    const message = entry.message
    if (message.type === 'system' && message.subtype === 'init') {
      const model = nonEmptyString(message.model) ?? 'model'
      const tools = Array.isArray(message.tools) ? message.tools.length : 0
      blocks.push(block('meta', bound(`> 模型 ${model} · ${tools} tools`)))
    } else if (message.type === 'assistant') {
      blocks.push(...assistantBlocks(sdkContent(message)))
    } else if (message.type === 'user') {
      blocks.push(...userBlocks(sdkContent(message)))
    } else if (message.type === 'result') {
      blocks.push(resultBlock(message))
    } else if (message.type === 'error') {
      blocks.push(errorBlock(message))
    }
  }

  return blocks
}
