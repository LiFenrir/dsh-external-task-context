/**
 * Shared display helpers for the external-task page.
 *
 * Kept dependency-free apart from the locale dictionary so both the page
 * header, the stream pane, and the statistics pane format values identically.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ExternalTaskStatus } from '../shared/projection.ts'
import { NS } from './locales.ts'

/** Map the status union to its localized label, falling back to `unknown`. */
export function statusLabel(status: ExternalTaskStatus, t: TranslateNS<typeof NS>): string {
  switch (status) {
    case 'pending': return t('status.pending')
    case 'completed': return t('status.completed')
    case 'aborted': return t('status.aborted')
    case 'max-tokens': return t('status.maxTokens')
    case 'refusal': return t('status.refusal')
    case 'error': return t('status.error')
    case 'unknown': return t('status.unknown')
    default: return t('status.unknown')
  }
}

/** Epoch milliseconds in the viewer's local convention. */
export function formatTime(milliseconds: number): string {
  return new Date(milliseconds).toLocaleString()
}

/** Compact id for a task that has no catalog label. */
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id
}
