/**
 * Pure line parsers for the two Claude Code run traces.
 *
 * Nothing here touches React, stores, or the network: the component feeds the
 * accumulated text of one source to {@link parseDshLog} or
 * {@link parseNativeLog} and renders the resulting lines. Both parsers are
 * total: malformed JSON and unknown record types are skipped, never thrown.
 */
/** Longest text kept from one rendered entry; longer entries end in `…`. */
export const MAX_RENDER_CHARS = 2000

/** Visual class of one terminal line. */
export type TuiLineKind =
  | 'start'
  | 'end'
  | 'text'
  | 'thinking'
  | 'tool'
  | 'result'
  | 'error'
  | 'meta'

/** One rendered terminal line. */
export interface TuiLine {
  kind: TuiLineKind
  text: string
  /** Source timestamp in epoch milliseconds, when the record carries one. */
  time?: number
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

/** Truncate one rendered entry and mark the cut. */
function bound(text: string): string {
  return text.length > MAX_RENDER_CHARS ? `${text.slice(0, MAX_RENDER_CHARS)}…` : text
}

/** Compact JSON for tool arguments; malformed values render as an empty tail. */
function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
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

function line(kind: TuiLineKind, text: string, time: number | undefined): TuiLine {
  return { kind, text: bound(text), ...(time !== undefined ? { time } : {}) }
}

/** Render assistant content blocks (text, thinking, tool_use). */
function assistantBlocks(content: unknown, time: number | undefined): TuiLine[] {
  if (typeof content === 'string') {
    return content.length > 0 ? [line('text', content, time)] : []
  }
  if (!Array.isArray(content)) return []

  const result: TuiLine[] = []
  for (const block of content) {
    if (!isRecord(block)) continue
    switch (block.type) {
      case 'text': {
        const text = nonEmptyString(block.text)
        if (text !== undefined) result.push(line('text', text, time))
        break
      }
      case 'thinking': {
        const thinking = nonEmptyString(block.thinking)
        if (thinking !== undefined) result.push(line('thinking', `✻ ${thinking}`, time))
        break
      }
      case 'tool_use': {
        const name = nonEmptyString(block.name) ?? 'tool'
        const args = compactJson(block.input ?? block.arguments)
        result.push(line('tool', args.length > 0 ? `→ ${name} ${args}` : `→ ${name}`, time))
        break
      }
      default: break
    }
  }
  return result
}

/** Render user content blocks (text, tool_result). */
function userBlocks(content: unknown, time: number | undefined): TuiLine[] {
  if (typeof content === 'string') {
    return content.length > 0 ? [line('text', `> ${content}`, time)] : []
  }
  if (!Array.isArray(content)) return []

  const result: TuiLine[] = []
  for (const block of content) {
    if (!isRecord(block)) continue
    switch (block.type) {
      case 'text': {
        const text = nonEmptyString(block.text)
        if (text !== undefined) result.push(line('text', `> ${text}`, time))
        break
      }
      case 'tool_result': {
        const output = outputText(block.content)
        if (output.length > 0) result.push(line('tool', `← ${output}`, time))
        break
      }
      default: break
    }
  }
  return result
}

/**
 * Renderable content of a raw SDK message.
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

/** Render the SDK result record as one summary line. */
function resultLine(message: Record<string, unknown>, time: number | undefined): TuiLine {
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
  return line('result', parts.join(' · '), time)
}

/**
 * Parse the provider-neutral `<runId>.jsonl` trace.
 *
 * @param text - accumulated complete lines of the trace.
 * @returns terminal lines in source order.
 */
export function parseDshLog(text: string): TuiLine[] {
  const lines: TuiLine[] = []

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length === 0) continue
    let entry: unknown
    try {
      entry = JSON.parse(raw)
    } catch {
      continue
    }
    if (!isRecord(entry)) continue
    const time = finiteNumber(entry.time)

    if (entry.kind === 'start') {
      const cwd = nonEmptyString(entry.cwd) ?? '—'
      const model = nonEmptyString(entry.model) ?? '—'
      lines.push(line('start', `● start · cwd: ${cwd} · model: ${model}`, time))
      continue
    }
    if (entry.kind === 'end') {
      const status = nonEmptyString(entry.status) ?? 'unknown'
      lines.push(line('end', `■ ${status}`, time))
      continue
    }
    if (entry.kind !== 'message' || !isRecord(entry.message)) continue

    const message = entry.message
    if (message.type === 'system' && message.subtype === 'init') {
      const model = nonEmptyString(message.model) ?? 'model'
      const tools = Array.isArray(message.tools) ? message.tools.length : 0
      lines.push(line('start', `● ${model} · ${tools} tools`, time))
    } else if (message.type === 'assistant') {
      lines.push(...assistantBlocks(sdkContent(message), time))
    } else if (message.type === 'user') {
      lines.push(...userBlocks(sdkContent(message), time))
    } else if (message.type === 'result') {
      lines.push(resultLine(message, time))
    }
  }

  return lines
}

/** Timestamp for a native Claude Code record (`timestamp` ISO or `time` ms). */
function nativeTime(entry: Record<string, unknown>): number | undefined {
  const direct = finiteNumber(entry.time)
  if (direct !== undefined) return direct
  const timestamp = entry.timestamp
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * Parse Claude Code's native transcript.
 *
 * Only `user`, `assistant`, and `summary` rows carry renderable content; the
 * many bookkeeping rows (`queue-operation`, `attachment`, …) are skipped.
 *
 * @param text - accumulated complete lines of the transcript.
 * @returns terminal lines in source order.
 */
export function parseNativeLog(text: string): TuiLine[] {
  const lines: TuiLine[] = []

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length === 0) continue
    let entry: unknown
    try {
      entry = JSON.parse(raw)
    } catch {
      continue
    }
    if (!isRecord(entry)) continue

    const type = entry.type
    if (type !== 'user' && type !== 'assistant' && type !== 'summary') continue
    const time = nativeTime(entry)

    if (type === 'summary') {
      const summary = nonEmptyString(entry.summary)
      if (summary !== undefined) lines.push(line('meta', `Σ ${summary}`, time))
      continue
    }
    if (!isRecord(entry.message)) continue
    lines.push(...(type === 'assistant'
      ? assistantBlocks(entry.message.content, time)
      : userBlocks(entry.message.content, time)))
  }

  return lines
}
