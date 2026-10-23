/**
 * Pure readers for the runtime-owned `subagent-settled` notice.
 *
 * The notice is the only recorded statement of how an external child ended
 * and of its final output. Both readers mirror the exact English phrases the
 * runtime builds in `continuation-messages.ts`, so no session event is added
 * and no model-visible text changes.
 */
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { ExternalTaskStatus } from '../shared/projection.ts'

/** Marker the runtime writes instead of a closing message. */
const NO_CLOSING_MESSAGE = 'It left no closing message.'

/**
 * Map the notice's one-line summary to a status.
 *
 * The checks are ordered because every non-completed phrase ends in
 * "before it finished" (or, for the unknown arm, contains "finished" later).
 * @param summary - the notice summary written by the runtime.
 * @returns the projected terminal status.
 */
export function statusFromSettlementSummary(summary: string): ExternalTaskStatus {
  if (summary.includes('was stopped')) return 'aborted'
  if (summary.includes('ran out of room')) return 'max-tokens'
  if (summary.includes('declined the task')) return 'refusal'
  if (summary.includes('failed before it finished')) return 'error'
  if (summary.includes('ended abnormally')) return 'unknown'
  if (summary.includes('finished')) return 'completed'
  return 'unknown'
}

/**
 * Extract the summary line and the child's closing text from a settlement
 * notice.
 *
 * Content layout produced by the runtime: `[0]` the summary, `[1]` either
 * `Its closing message:` or {@link NO_CLOSING_MESSAGE}, then the child's text
 * blocks, an optional structured-result block, and an optional diagnostic
 * block. Only text blocks participate.
 * @param content - the recorded user-message blocks.
 * @returns the summary line and, when present, the joined closing text.
 */
export function answerFromSettlementContent(
  content: readonly ContentBlock[],
): { summary?: string; answer?: string } {
  const texts: string[] = []
  for (const block of content) {
    if (block.type === 'text') texts.push(block.text)
  }

  if (texts.length === 0) return {}
  const summary = texts[0] as string
  if (texts[1] === NO_CLOSING_MESSAGE) return { summary }

  // The closing marker occupies index 1; the child's own text starts at 2.
  const answer = texts.slice(2).join('\n\n')
  return answer.length === 0 ? { summary } : { summary, answer }
}
