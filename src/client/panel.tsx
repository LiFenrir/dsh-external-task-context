/**
 * Right-sidebar panel: the external-task list and the selected task's detail.
 *
 * The panel reads only the client projection. It keeps one piece of local
 * view state (the explicitly selected task) and otherwise follows the newest
 * task, so a newly recorded delegation appears without user action.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import {
  EXTERNAL_TASK_CONTEXTS,
  type ExternalTaskContextView,
  type ExternalTaskStatus,
} from '../shared/projection.ts'
import { NS } from './locales.ts'

/** Props of the sidebar tab body: session slot runtime and copy. */
export type ExternalTaskPanelProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<typeof NS>

const SHELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
  lineHeight: 1.5,
}

const HEADER: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '12px 14px 10px',
  borderBottom: '1px solid var(--dsw-alias-border-l1)',
  flex: 'none',
}

const TITLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary)',
}

const SUBTITLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const BODY: CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
}

const LIST_COLUMN: CSSProperties = {
  width: '38%',
  minWidth: 150,
  maxWidth: 260,
  flex: 'none',
  minHeight: 0,
  overflowY: 'auto',
  borderRight: '1px solid var(--dsw-alias-border-l1)',
  padding: 8,
  boxSizing: 'border-box',
}

const LIST: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const LIST_BUTTON_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 2,
  width: '100%',
  padding: '6px 8px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
}

const LIST_LABEL: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
}

const LIST_META: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 10,
  color: 'var(--dsw-alias-label-secondary)',
}

const DETAIL_COLUMN: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  padding: '12px 14px 20px',
  boxSizing: 'border-box',
}

const SECTION_TITLE: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-secondary)',
}

const ROW: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'baseline',
  padding: '2px 0',
}

const ROW_LABEL: CSSProperties = {
  flex: 'none',
  minWidth: 64,
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const ROW_VALUE: CSSProperties = {
  minWidth: 0,
  fontSize: 12,
  color: 'var(--dsw-alias-label-primary)',
  wordBreak: 'break-word',
}

const PRE_WRAP: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: 12,
  color: 'var(--dsw-alias-label-primary)',
}

const MONO: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 11,
  color: 'var(--dsw-alias-label-primary)',
  wordBreak: 'break-all',
}

const MUTED: CSSProperties = {
  fontSize: 12,
  color: 'var(--dsw-alias-label-secondary)',
}

const TRUNCATION: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const NOTICE_SHELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 20,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
}

const NOTICE_TITLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary)',
}

/** Map the status union to its localized label, falling back to `unknown`. */
function statusLabel(status: ExternalTaskStatus, t: TranslateNS<typeof NS>): string {
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
function formatTime(milliseconds: number): string {
  return new Date(milliseconds).toLocaleString()
}

/** Compact id for a task that has no catalog label. */
function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={ROW}>
      <span style={ROW_LABEL}>{label}</span>
      <span style={ROW_VALUE}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section style={{ marginTop: 14 }}>
      <h3 style={SECTION_TITLE}>{title}</h3>
      {children}
    </section>
  )
}

function Notice({ title, hint }: { title: string; hint?: string }): JSX.Element {
  return (
    <div style={NOTICE_SHELL} role="status">
      <div style={NOTICE_TITLE}>{title}</div>
      {hint !== undefined ? <div>{hint}</div> : null}
    </div>
  )
}

function TaskDetail({ task, t }: { task: ExternalTaskContextView; t: TranslateNS<typeof NS> }): JSX.Element {
  const options = task.options

  return (
    <div>
      <Row label={t('detail.status')} value={statusLabel(task.status, t)} />
      <Row label={t('detail.createdAt')} value={formatTime(task.createdAt)} />
      {task.completedAt !== undefined
        ? <Row label={t('detail.completedAt')} value={formatTime(task.completedAt)} />
        : null}
      {task.tool !== undefined ? <Row label={t('detail.tool')} value={task.tool} /> : null}

      <Section title={t('detail.prompt')}>
        {task.prompt !== undefined
          ? (
            <>
              <div style={PRE_WRAP}>{task.prompt}</div>
              {task.promptTruncated === true ? <div style={TRUNCATION}>{t('detail.truncated')}</div> : null}
            </>
          )
          : <div style={MUTED}>{t('detail.promptMissing')}</div>}
      </Section>

      {task.cwd !== undefined
        ? (
          <Section title={t('detail.cwd')}>
            <div style={MONO}>{task.cwd}</div>
          </Section>
        )
        : null}

      {options !== undefined && (
        options.provider !== undefined
        || options.model !== undefined
        || options.reasoningEffort !== undefined
        || options.agentPreset !== undefined
      )
        ? (
          <Section title={t('detail.context')}>
            {options?.provider !== undefined
              ? <Row label={t('detail.provider')} value={options.provider} />
              : null}
            {options?.model !== undefined ? <Row label={t('detail.model')} value={options.model} /> : null}
            {options?.reasoningEffort !== undefined
              ? <Row label={t('detail.reasoning')} value={options.reasoningEffort} />
              : null}
            {options?.agentPreset !== undefined
              ? <Row label={t('detail.preset')} value={options.agentPreset} />
              : null}
          </Section>
        )
        : null}

      <Section title={t('detail.answer')}>
        {task.status === 'pending'
          ? <div style={MUTED}>{t('detail.answerPending')}</div>
          : task.answer !== undefined
            ? (
              <>
                <div style={PRE_WRAP}>{task.answer}</div>
                {task.answerTruncated === true ? <div style={TRUNCATION}>{t('detail.truncated')}</div> : null}
              </>
            )
            : <div style={MUTED}>{t('detail.answerEmpty')}</div>}
      </Section>

      {task.summary !== undefined
        ? (
          <Section title={t('detail.summary')}>
            <div style={PRE_WRAP}>{task.summary}</div>
          </Section>
        )
        : null}
    </div>
  )
}

/**
 * Render the external-task list and the selected task's detail.
 * @param props - projection hook and namespace translator.
 * @returns the panel, or a localized empty/unavailable state.
 */
export function ExternalTaskContextPanel({ useProjection, t }: ExternalTaskPanelProps): JSX.Element {
  const tasks = useProjection(EXTERNAL_TASK_CONTEXTS)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  if (tasks === undefined) {
    return <Notice title={t('panel.unavailable')} hint={t('panel.unavailableHint')} />
  }
  if (tasks.length === 0) {
    return <Notice title={t('panel.empty')} />
  }

  // An explicit selection wins while its task exists; a task that disappeared
  // (or no selection at all) falls back to the newest, which is the last entry
  // in catalog order.
  const active = (selectedId !== undefined
    ? tasks.find(task => task.id === selectedId)
    : undefined) ?? tasks[tasks.length - 1]
  if (active === undefined) return <Notice title={t('panel.selectHint')} />

  return (
    <div style={SHELL}>
      <div style={HEADER}>
        <span style={TITLE}>{t('panel.title')}</span>
        <span style={SUBTITLE}>{t('panel.subtitle')}</span>
      </div>
      <div style={BODY}>
        <div style={LIST_COLUMN}>
          <ul style={LIST} aria-label={t('panel.listAria')}>
            {tasks.map((task) => {
              const selected = task.id === active.id
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => { setSelectedId(task.id) }}
                    style={selected
                      ? {
                        ...LIST_BUTTON_BASE,
                        background: 'var(--dsw-alias-interactive-bg-hover)',
                        color: 'var(--dsw-alias-label-primary)',
                      }
                      : {
                        ...LIST_BUTTON_BASE,
                        color: 'var(--dsw-alias-label-secondary)',
                      }}
                  >
                    <span style={LIST_LABEL}>{task.label ?? shortId(task.id)}</span>
                    <span style={LIST_META}>
                      {statusLabel(task.status, t)}
                      {' · '}
                      {formatTime(task.createdAt)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div style={DETAIL_COLUMN}>
          <TaskDetail task={active} t={t} />
        </div>
      </div>
    </div>
  )
}
