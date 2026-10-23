/**
 * Session-header action: opens the external-task context panel.
 *
 * The action is absent until the session projection carries at least one
 * external task; an empty or unavailable projection renders nothing.
 */
import { useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { EXTERNAL_TASK_CONTEXTS } from '../shared/projection.ts'
import { NS } from './locales.ts'

/** Props of the header action: slot runtime, the panel opener, and copy. */
export type ExternalTaskActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & { openPanel: () => void }
  & PropsLocale<typeof NS>

/** Magnifier over a chat rectangle. */
function ContextIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <rect x="3" y="4" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8.5h6M7 11.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="15.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="m18.7 17.7 2.3 2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 26,
  padding: '0 8px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  font: 'inherit',
  fontSize: 12,
  lineHeight: 1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const HOVER_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-primary)',
  background: 'var(--dsw-alias-interactive-bg-hover)',
}

/**
 * Render the header button for this session's external tasks.
 * @param props - projection hook, panel opener, and namespace translator.
 * @returns the action, or null when no external task exists.
 */
export function ExternalTaskContextAction({ useProjection, openPanel, t }: ExternalTaskActionProps): JSX.Element | null {
  const [hovered, setHovered] = useState(false)
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS)

  if (tasks === undefined || tasks.length === 0) return null

  const label = t('action.label', { count: tasks.length })
  return (
    <button
      type="button"
      title={t('action.tooltip')}
      aria-label={label}
      onClick={openPanel}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      style={hovered ? { ...BASE_STYLE, ...HOVER_STYLE } : BASE_STYLE}
    >
      <ContextIcon />
      <span>{label}</span>
    </button>
  )
}
