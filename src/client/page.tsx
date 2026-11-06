/**
 * Conversation-view body for one session's external tasks.
 *
 * Registered as `conversation.view` id `external-task`, so the View tab row in
 * the session header provides navigation and this component renders inside the
 * session body. It follows the session projection, selects one task, and shows
 * either the streamed conversation or the aggregated statistics.
 */
import { useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  EXTERNAL_TASK_CONTEXTS,
  type ExternalTaskContextView,
  type ExternalTaskStatus,
} from '../shared/projection.ts'
import { NS } from './locales.ts'
import { formatTime, shortId, statusLabel } from './page-utils.ts'
import { StatsPane } from './page-stats.tsx'
import { StreamPane } from './page-stream.tsx'

/** Complete props received by the conversation-view component. */
export type ExternalTaskViewProps =
  PropsRuntime<'conversation.view'>
  & PropsLocale<typeof NS>

/** Selected mode of the view body. */
type ViewMode = 'conversation' | 'stats'

const CLAUDE_CODE_TOOL = 'subagent_claude_code'

const SHELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
  lineHeight: 1.5,
}

const TOOLBAR: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  flex: 'none',
  padding: '12px 20px 8px',
  borderBottom: '1px solid var(--dsw-alias-border-l1)',
  boxSizing: 'border-box',
}

const DOT: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  flex: 'none',
  background: 'var(--dsw-alias-label-secondary)',
}

const STATUS: CSSProperties = {
  flex: 'none',
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const META: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const SPACER: CSSProperties = {
  flex: 1,
}

const SELECT: CSSProperties = {
  maxWidth: 220,
  height: 26,
  padding: '0 6px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
}

const CHIP: CSSProperties = {
  padding: '2px 10px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 999,
  background: 'transparent',
  font: 'inherit',
  fontSize: 11,
  lineHeight: '16px',
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
}

const CHIP_ACTIVE: CSSProperties = {
  ...CHIP,
  background: 'var(--dsw-alias-interactive-bg-hover)',
  color: 'var(--dsw-alias-label-primary)',
}

const CHIP_DISABLED: CSSProperties = {
  ...CHIP,
  cursor: 'default',
  opacity: 0.45,
}

const CONTENT: CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
}

const STATS_SCROLL: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '0 20px',
  boxSizing: 'border-box',
}

const NOTICE_SHELL: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  flex: 1,
  minHeight: 0,
  padding: 24,
  boxSizing: 'border-box',
}

const NOTICE_BOX: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  maxWidth: 460,
  padding: 20,
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 10,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
}

const NOTICE_TITLE: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary)',
}

const STATUS_DOT_COLORS: Record<ExternalTaskStatus, string> = {
  pending: 'var(--dsw-alias-label-secondary)',
  completed: 'var(--dsw-alias-label-primary)',
  aborted: 'var(--dsw-alias-label-secondary)',
  'max-tokens': 'var(--dsw-alias-label-secondary)',
  refusal: 'var(--dsw-alias-label-secondary)',
  error: 'var(--dsw-alias-label-primary)',
  unknown: 'var(--dsw-alias-label-secondary)',
}

/** Task label for display, falling back to a compact id. */
function taskLabel(task: ExternalTaskContextView): string {
  return task.label ?? shortId(task.id)
}

function Notice({ title, hint }: { title: string; hint?: string }): JSX.Element {
  return (
    <div style={NOTICE_SHELL}>
      <div style={NOTICE_BOX} role="status">
        <div style={NOTICE_TITLE}>{title}</div>
        {hint !== undefined ? <div>{hint}</div> : null}
      </div>
    </div>
  )
}

/**
 * Render the external-task conversation view.
 * @param props - session-scoped projection hook and copy.
 * @returns the task toolbar plus conversation or statistics body.
 */
export function ExternalTaskView({ useProjection, t }: ExternalTaskViewProps): JSX.Element {
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [mode, setMode] = useState<ViewMode>('conversation')

  if (tasks === undefined) {
    return <Notice title={t('page.unavailable')} hint={t('page.unavailableHint')} />
  }
  if (tasks.length === 0) {
    return <Notice title={t('page.empty')} />
  }

  // An explicit selection wins while its task exists; a task that disappeared
  // (or no selection at all) falls back to the newest entry.
  const active = (selectedId !== undefined
    ? tasks.find(task => task.id === selectedId)
    : undefined) ?? tasks[tasks.length - 1]
  if (active === undefined) {
    return <Notice title={t('page.empty')} />
  }

  const running = active.status === 'pending'
  const claudeCode = active.tool === CLAUDE_CODE_TOOL
  const effectiveMode = mode === 'stats' && !claudeCode ? 'conversation' : mode

  const meta = [active.tool, `${t('detail.createdAt')} ${formatTime(active.createdAt)}`]
    .filter((part): part is string => part !== undefined)
    .join(' · ')

  return (
    <div style={SHELL}>
      <div style={TOOLBAR}>
        <span style={{ ...DOT, background: STATUS_DOT_COLORS[active.status] }} aria-hidden="true" />
        <span style={STATUS}>{statusLabel(active.status, t)}</span>
        <span style={META}>{meta}</span>

        {tasks.length > 1
          ? (
            <select
              aria-label={t('page.taskSelectAria')}
              value={active.id}
              onChange={(event) => { setSelectedId(event.target.value) }}
              style={SELECT}
            >
              {tasks.map(task => (
                <option key={task.id} value={task.id}>{taskLabel(task)}</option>
              ))}
            </select>
          )
          : null}

        <span style={SPACER} />

        <button
          type="button"
          aria-pressed={effectiveMode === 'conversation'}
          onClick={() => { setMode('conversation') }}
          style={effectiveMode === 'conversation' ? CHIP_ACTIVE : CHIP}
        >
          {t('view.mode.conversation')}
        </button>
        <button
          type="button"
          aria-pressed={effectiveMode === 'stats'}
          disabled={!claudeCode}
          onClick={() => { if (claudeCode) setMode('stats') }}
          style={!claudeCode
            ? CHIP_DISABLED
            : effectiveMode === 'stats' ? CHIP_ACTIVE : CHIP}
        >
          {t('view.mode.stats')}
        </button>
      </div>

      <div style={CONTENT}>
        {effectiveMode === 'stats'
          ? (
            <div style={STATS_SCROLL}>
              <StatsPane task={active} running={running} t={t} />
            </div>
          )
          : <StreamPane task={active} running={running} t={t} />}
      </div>
    </div>
  )
}
