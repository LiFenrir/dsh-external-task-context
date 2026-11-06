/**
 * Pure aggregator for the Claude Code DSH run trace.
 *
 * The function consumes the complete accumulated text of the trace and returns
 * the shape the statistics pane renders. Parsing is total: malformed JSON,
 * unknown record types, and missing fields are skipped.
 */
/** Aggregated facts of one run trace. */
export interface TaskLogStats {
  /** Assistant messages. */
  readonly messages: number
  /** `tool_use` blocks inside assistant messages. */
  readonly toolCalls: number
  /** `tool_result` blocks inside user messages. */
  readonly toolResults: number
  /** Input tokens of the last reported usage record (0 when none). */
  readonly inputTokens: number
  /** Output tokens of the last reported usage record (0 when none). */
  readonly outputTokens: number
  /** Reported total cost in USD, when the trace carries one. */
  readonly costUsd?: number
  /** First timestamp seen, in epoch milliseconds. */
  readonly startedAt?: number
  /** Last timestamp seen, in epoch milliseconds. */
  readonly endedAt?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function numberOrZero(value: unknown): number {
  return finiteNumber(value) ?? 0
}

/**
 * Raw SDK message content.
 *
 * `SDKAssistantMessage`/`SDKUserMessage` wrap the API message, so content
 * lives at `message.message.content`; flat hand-built fixtures keep it at
 * `message.content`.
 */
function sdkContent(message: Record<string, unknown>): unknown {
  const nested = message.message
  if (isRecord(nested) && 'content' in nested) return nested.content
  return message.content
}

/** Count content blocks of one `type`; non-array content counts zero. */
function countBlocks(content: unknown, type: string): number {
  if (!Array.isArray(content)) return 0
  let count = 0
  for (const block of content) {
    if (isRecord(block) && block.type === type) count += 1
  }
  return count
}

/** Mutable accumulator of the walker. */
interface Accumulator {
  messages: number
  toolCalls: number
  toolResults: number
  inputTokens: number
  outputTokens: number
  costUsd: number | undefined
  startedAt: number | undefined
  endedAt: number | undefined
}

function emptyAccumulator(): Accumulator {
  return {
    messages: 0,
    toolCalls: 0,
    toolResults: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: undefined,
    startedAt: undefined,
    endedAt: undefined,
  }
}

/**
 * Replace the token counters with one reported usage record.
 *
 * Counts are the LAST reported usage, never a sum: each usage record replaces
 * the previous one, and a field that record omits reads as 0.
 */
function applyUsage(accumulator: Accumulator, usage: unknown): void {
  if (!isRecord(usage)) return
  accumulator.inputTokens = numberOrZero(usage.input_tokens)
  accumulator.outputTokens = numberOrZero(usage.output_tokens)
}

/** Track the first and last record timestamps. */
function trackTime(accumulator: Accumulator, time: number | undefined): void {
  if (time === undefined) return
  if (accumulator.startedAt === undefined) accumulator.startedAt = time
  accumulator.endedAt = time
}

function finalize(accumulator: Accumulator): TaskLogStats {
  return {
    messages: accumulator.messages,
    toolCalls: accumulator.toolCalls,
    toolResults: accumulator.toolResults,
    inputTokens: accumulator.inputTokens,
    outputTokens: accumulator.outputTokens,
    ...(accumulator.costUsd !== undefined ? { costUsd: accumulator.costUsd } : {}),
    ...(accumulator.startedAt !== undefined ? { startedAt: accumulator.startedAt } : {}),
    ...(accumulator.endedAt !== undefined ? { endedAt: accumulator.endedAt } : {}),
  }
}

/**
 * Aggregate the provider-neutral `<runId>.jsonl` trace.
 *
 * @param text - accumulated complete lines of the trace.
 * @returns counts, last reported usage, cost, and first/last times.
 */
export function summarizeDshLog(text: string): TaskLogStats {
  const accumulator = emptyAccumulator()

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
    trackTime(accumulator, time)

    if (entry.kind !== 'message' || !isRecord(entry.message)) continue
    const message = entry.message

    if (message.type === 'assistant') {
      accumulator.messages += 1
      accumulator.toolCalls += countBlocks(sdkContent(message), 'tool_use')
      // The raw SDK assistant message keeps usage beside its content; the
      // final `result` message, when present, reports the authoritative last
      // usage and therefore wins here.
      const nested = message.message
      applyUsage(accumulator, isRecord(nested) ? nested.usage : undefined)
    } else if (message.type === 'user') {
      accumulator.toolResults += countBlocks(sdkContent(message), 'tool_result')
    } else if (message.type === 'result') {
      applyUsage(accumulator, message.usage)
      const cost = finiteNumber(message.total_cost_usd)
      if (cost !== undefined) accumulator.costUsd = cost
    }
  }

  return finalize(accumulator)
}
