/**
 * Statistics pane of the external-task conversation view.
 *
 * The complete trace is read through the plugin's log route in offset chunks,
 * summarized locally, and re-read every two seconds while the task runs.
 * All view state stays inside this component.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ExternalTaskContextView } from '../shared/projection.ts'
import { NS } from './locales.ts'
import { summarizeDshLog, type TaskLogStats } from './log-stats.ts'
import { statusLabel } from './page-utils.ts'

/** State of the aggregate read. */
type LoadState = 'loading' | 'ready' | 'error'

/** Props of the statistics pane. */
export interface StatsPaneProps {
  readonly task: ExternalTaskContextView
  readonly running: boolean
  readonly t: TranslateNS<typeof NS>
}

const POLL_INTERVAL_MS = 2000
/** Upper bound of offset reads for one complete log snapshot. */
const MAX_READS = 64

const SHELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  width: '100%',
  padding: '14px 0 0',
  boxSizing: 'border-box',
}

const TOOLBAR: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 6,
}

const RUNNING: CSSProperties = {
  fontSize: 10,
  color: 'var(--dsw-alias-label-secondary)',
}

const CHIP: CSSProperties = {
  padding: '2px 8px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 999,
  background: 'transparent',
  font: 'inherit',
  fontSize: 11,
  lineHeight: '16px',
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
}

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 10,
}

const CARD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  padding: '10px 12px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 8,
  boxSizing: 'border-box',
}

const CARD_LABEL: CSSProperties = {
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const CARD_VALUE: CSSProperties = {
  fontSize: 17,
  lineHeight: 1.35,
  color: 'var(--dsw-alias-label-primary)',
  fontVariantNumeric: 'tabular-nums',
  overflowWrap: 'anywhere',
}

const NOTICE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '18px 0',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read the success envelope, or `undefined` for anything malformed. */
function chunkOf(payload: unknown): { content: string; nextOffset: number } | undefined {
  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.value)) return undefined
  const content = payload.value.content
  const nextOffset = payload.value.nextOffset
  if (typeof content !== 'string'
    || typeof nextOffset !== 'number'
    || !Number.isSafeInteger(nextOffset)
    || nextOffset < 0) {
    return undefined
  }
  return { content, nextOffset }
}

/** Duration already known from the task, else the trace's start/end span. */
function taskDuration(task: ExternalTaskContextView, stats: TaskLogStats | undefined): number | undefined {
  if (task.completedAt !== undefined) {
    return Math.max(0, task.completedAt - task.createdAt)
  }
  if (stats?.startedAt !== undefined && stats.endedAt !== undefined) {
    return Math.max(0, stats.endedAt - stats.startedAt)
  }
  return undefined
}

/** Human-readable duration with millisecond precision below one second. */
function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds}ms`
  const seconds = milliseconds / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}m ${String(rest).padStart(2, '0')}s`
}

/**
 * Render the aggregated run statistics of the DSH trace.
 * @param props - the task, whether it is still running, and copy.
 * @returns the statistics pane.
 */
export function StatsPane({ task, running, t }: StatsPaneProps): JSX.Element {
  const [stats, setStats] = useState<TaskLogStats | undefined>(undefined)
  const [state, setState] = useState<LoadState>('loading')
  const [refreshSeq, setRefreshSeq] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    setState('loading')
    setStats(undefined)

    const tick = async (): Promise<void> => {
      let offset = 0
      let text = ''
      let readAny = false
      let failed = false

      for (let reads = 0; reads < MAX_READS; reads += 1) {
        try {
          const query = new URLSearchParams({
            childId: task.id,
            source: 'dsh',
            offset: String(offset),
          })
          const response = await fetch(`/api/external-task-context/log?${query.toString()}`, {
            credentials: 'same-origin',
            cache: 'no-store',
          })
          if (!active) return

          let payload: unknown
          try {
            payload = await response.json()
          } catch {
            payload = undefined
          }
          const chunk = response.ok ? chunkOf(payload) : undefined
          if (chunk === undefined) {
            // A single failed read after at least one good chunk keeps the
            // partial snapshot; an all-failed read reports unavailable.
            if (!readAny) { setState('error'); failed = true }
            break
          }

          readAny = true
          if (chunk.content.length === 0) break
          text += chunk.content
          const advanced = chunk.nextOffset > offset
          offset = chunk.nextOffset
          if (!advanced) break
        } catch {
          if (!active) return
          if (!readAny) { setState('error'); failed = true }
          break
        }
      }

      if (!active) return
      if (!failed) {
        setStats(summarizeDshLog(text))
        setState('ready')
      }
      // A pending run may not have written its trace yet; keep retrying so the
      // first successful snapshot replaces the unavailable state.
      if (running) timer = setTimeout(() => { void tick() }, POLL_INTERVAL_MS)
    }

    void tick()
    return () => {
      active = false
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [task.id, running, refreshSeq])

  const duration = taskDuration(task, stats)
  const unavailable = t('stats.notAvailable')

  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: t('stats.status'), value: statusLabel(task.status, t) },
    { label: t('stats.duration'), value: duration !== undefined ? formatDuration(duration) : unavailable },
    { label: t('stats.messages'), value: stats !== undefined ? stats.messages.toLocaleString() : unavailable },
    { label: t('stats.toolCalls'), value: stats !== undefined ? stats.toolCalls.toLocaleString() : unavailable },
    { label: t('stats.toolResults'), value: stats !== undefined ? stats.toolResults.toLocaleString() : unavailable },
    { label: t('stats.inputTokens'), value: stats !== undefined ? stats.inputTokens.toLocaleString() : unavailable },
    { label: t('stats.outputTokens'), value: stats !== undefined ? stats.outputTokens.toLocaleString() : unavailable },
    {
      label: t('stats.cost'),
      value: stats?.costUsd !== undefined ? `$${stats.costUsd.toFixed(4)}` : unavailable,
    },
  ]

  return (
    <div style={SHELL}>
      <div style={TOOLBAR}>
        {running ? <span style={RUNNING}>{t('log.running')}</span> : null}
        <button
          type="button"
          onClick={() => { setRefreshSeq(sequence => sequence + 1) }}
          style={CHIP}
        >
          {t('log.refresh')}
        </button>
      </div>

      {state === 'error'
        ? <div style={NOTICE} role="status">{t('stats.unavailable')}</div>
        : (
          <div style={GRID}>
            {rows.map(row => (
              <div key={row.label} style={CARD}>
                <span style={CARD_LABEL}>{row.label}</span>
                <span style={CARD_VALUE}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
