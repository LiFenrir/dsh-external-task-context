/**
 * Streamed conversation pane of the external-task view.
 *
 * The delegation prompt is the user's message; the run log is appended below
 * it as structured blocks while the task executes; the returned result is
 * appended after the log once the task settles. The component owns no store:
 * it tails the plugin's authenticated log route for the DSH trace, parses only
 * the newly read text, and keeps the appended blocks locally.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ExternalTaskContextView } from '../shared/projection.ts'
import { NS } from './locales.ts'
import { formatTime } from './page-utils.ts'
import {
  dshLogToMarkdown,
  TRUNCATION_NOTE,
  type FileChange,
  type MarkdownBlock,
} from './log-markdown.ts'

/** Route/network state of the tail. */
type LoadState = 'loading' | 'ready' | 'error'

/** Props of the stream pane. */
export interface StreamPaneProps {
  readonly task: ExternalTaskContextView
  readonly running: boolean
  readonly t: TranslateNS<typeof NS>
}

const CLAUDE_CODE_TOOL = 'subagent_claude_code'
const POLL_INTERVAL_MS = 1000
/** Upper bound of offset reads for one appended snapshot. */
const MAX_READS = 64
/** Fixed height of the delegation-prompt bubble. */
const PROMPT_HEIGHT = 240
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const SHELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  color: 'var(--dsw-alias-label-primary)',
}

const TOOLBAR: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 6,
  flex: 'none',
  padding: '12px 20px 8px',
  boxSizing: 'border-box',
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

const SCROLL: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '0 20px 32px',
  boxSizing: 'border-box',
}

const COLUMN: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  width: '100%',
  maxWidth: 920,
  margin: '0 auto',
  padding: '14px 4px 0',
  boxSizing: 'border-box',
  fontSize: 14,
  lineHeight: 1.6,
}

const USER_ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
}

const USER_COLUMN: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 6,
  maxWidth: '86%',
}

const META: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-secondary)',
  textAlign: 'right',
  overflowWrap: 'anywhere',
}

const USER_BUBBLE: CSSProperties = {
  maxWidth: '82%',
  height: PROMPT_HEIGHT,
  overflowY: 'auto',
  padding: '10px 14px',
  borderRadius: 12,
  background: 'var(--dsw-alias-interactive-bg-hover)',
  color: 'var(--dsw-alias-label-primary)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  boxSizing: 'border-box',
}

const SECTION_LABEL: CSSProperties = {
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-secondary)',
}

const MUTED: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
}

const TRUNCATION: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const PLACEHOLDER: CSSProperties = {
  ...MUTED,
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const NOTE: CSSProperties = {
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
}

const DETAILS: CSSProperties = {
  borderLeft: '2px solid var(--dsw-alias-border-l1)',
  paddingLeft: 10,
}

const SUMMARY: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.6,
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
  overflowWrap: 'anywhere',
}

const DETAIL_BODY: CSSProperties = {
  marginTop: 6,
}

const CHANGE_BOX: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 8,
  overflow: 'hidden',
  fontSize: 12,
}

const CHANGE_TITLE: CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--dsw-alias-border-l1)',
  fontFamily: MONO_FONT,
  fontSize: 11,
  color: 'var(--dsw-alias-label-secondary)',
  overflowWrap: 'anywhere',
}

const DIFF_BODY: CSSProperties = {
  overflowX: 'auto',
  padding: '4px 0',
}

const DIFF_LINE: CSSProperties = {
  padding: '0 10px',
  fontFamily: MONO_FONT,
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: 'pre',
}

const DIFF_COLORS: Record<'add' | 'del' | 'context', string> = {
  add: '#2f9e44',
  del: 'var(--dsw-alias-state-error-primary)',
  context: 'var(--dsw-alias-label-secondary)',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Extract the route's typed failure code from an unknown payload. */
function failureCode(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error)) {
    const code = payload.error.code
    if (typeof code === 'string') return code
  }
  return 'read-failed'
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

/** Build the small meta line shown above the user bubble. */
function metaLine(task: ExternalTaskContextView, t: TranslateNS<typeof NS>): string {
  const parts: string[] = []
  if (task.tool !== undefined) parts.push(task.tool)
  parts.push(`${t('detail.createdAt')} ${formatTime(task.createdAt)}`)
  if (task.cwd !== undefined) parts.push(task.cwd)

  const options = task.options
  if (options?.provider !== undefined) parts.push(`${t('detail.provider')}: ${options.provider}`)
  if (options?.model !== undefined) parts.push(`${t('detail.model')}: ${options.model}`)
  if (options?.reasoningEffort !== undefined) parts.push(`${t('detail.reasoning')}: ${options.reasoningEffort}`)
  if (options?.agentPreset !== undefined) parts.push(`${t('detail.preset')}: ${options.agentPreset}`)

  return parts.join(' · ')
}

/** Open muted container for meta/result/error blocks. */
function openStyle(kind: MarkdownBlock['kind']): CSSProperties {
  switch (kind) {
    case 'meta':
    case 'result':
    case 'error':
      return {
        paddingLeft: 10,
        borderLeft: '2px solid var(--dsw-alias-border-l1)',
        opacity: 0.85,
      }
    default:
      return {}
  }
}

/** Diff view of one Write/Edit-style tool call. */
function FileChangeView({ change, t }: {
  change: FileChange
  t: TranslateNS<typeof NS>
}): JSX.Element {
  return (
    <div style={CHANGE_BOX}>
      <div style={CHANGE_TITLE}>{change.path ?? `${t('fileChange.title')} · ${change.tool}`}</div>
      <div style={DIFF_BODY}>
        {change.lines.map((line, index) => (
          <div
            key={index}
            style={{ ...DIFF_LINE, color: DIFF_COLORS[line.kind] }}
          >
            {line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}
            {line.text}
          </div>
        ))}
      </div>
      {change.truncated ? <div style={TRUNCATION}>{t('fileChange.truncated')}</div> : null}
    </div>
  )
}

/** One collapsed or open log block. */
function LogBlock({ block, t }: {
  block: MarkdownBlock
  t: TranslateNS<typeof NS>
}): JSX.Element | null {
  if (block.kind === 'fileChange') {
    const change = block.change
    return change !== undefined ? <FileChangeView change={change} t={t} /> : null
  }

  if (block.collapsible === true) {
    const title = block.kind === 'thinking'
      ? t('tool.thinking')
      : block.kind === 'toolResult'
        ? t('tool.result')
        : block.title ?? block.kind
    return (
      <details style={DETAILS}>
        <summary style={SUMMARY}>{title}</summary>
        <div style={DETAIL_BODY}>
          <MarkdownText text={block.markdown} labels={labelsFor(t)} />
        </div>
      </details>
    )
  }

  return (
    <div style={openStyle(block.kind)}>
      <MarkdownText text={block.markdown} labels={labelsFor(t)} />
    </div>
  )
}

/** MarkdownText chrome labels for the active namespace. */
function labelsFor(t: TranslateNS<typeof NS>): {
  code: { copyLabel: string; copiedLabel: string }
  footnotes: string
} {
  return {
    code: { copyLabel: t('markdown.copy'), copiedLabel: t('markdown.copied') },
    footnotes: t('markdown.footnotes'),
  }
}

/**
 * Render the streamed conversation for one external task.
 * @param props - the task, whether it is still pending, and copy.
 * @returns the prompt, streamed log, and settled result.
 */
export function StreamPane({ task, running, t }: StreamPaneProps): JSX.Element {
  const claudeCode = task.tool === CLAUDE_CODE_TOOL
  const [blocks, setBlocks] = useState<MarkdownBlock[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)
  const [refreshSeq, setRefreshSeq] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const runningRef = useRef(running)
  const flushRef = useRef<(() => void) | null>(null)

  const markdownLabels = useMemo(() => labelsFor(t), [t])

  useEffect(() => {
    runningRef.current = running
  }, [running])

  useEffect(() => {
    if (!claudeCode) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let offset = 0
    let reading = false

    setBlocks([])
    setState('loading')
    setErrorCode(undefined)

    const tick = async (): Promise<void> => {
      if (reading) return
      reading = true
      try {
        for (let reads = 0; reads < MAX_READS; reads += 1) {
          let chunk: { content: string; nextOffset: number } | undefined
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
            chunk = response.ok ? chunkOf(payload) : undefined
            if (chunk === undefined) {
              // Keep the blocks already shown; a pending run keeps retrying so
              // the first successful read replaces the unavailable state.
              setState('error')
              setErrorCode(failureCode(payload))
              return
            }
          } catch {
            if (!active) return
            setState('error')
            setErrorCode('read-failed')
            return
          }

          const previousOffset = offset
          offset = chunk.nextOffset
          setState('ready')
          if (chunk.content.length > 0) {
            const parsed = dshLogToMarkdown(chunk.content)
            if (parsed.length > 0) setBlocks(previous => [...previous, ...parsed])
          }
          // An empty or non-advancing read is the end of this snapshot.
          if (chunk.content.length === 0 || offset <= previousOffset) return
        }
      } finally {
        reading = false
        if (active && runningRef.current) {
          timer = setTimeout(() => { void tick() }, POLL_INTERVAL_MS)
        }
      }
    }

    flushRef.current = () => { void tick() }
    void tick()
    return () => {
      active = false
      flushRef.current = null
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [claudeCode, task.id, refreshSeq])

  // A settled task may have written its final trace lines after the last poll;
  // one extra read captures the closing result/end records.
  useEffect(() => {
    if (!running && claudeCode) {
      const flush = flushRef.current
      if (flush !== null) flush()
    }
  }, [running, claudeCode])

  useEffect(() => {
    const element = scrollRef.current
    if (element !== null) element.scrollTop = element.scrollHeight
  }, [blocks, task.status, task.answer, task.summary])

  const truncated = blocks.some(block => block.markdown.includes(TRUNCATION_NOTE))
  const resultText = task.answer ?? task.summary

  return (
    <div style={SHELL}>
      {claudeCode
        ? (
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
        )
        : null}

      <div
        ref={scrollRef}
        style={SCROLL}
        role="log"
        aria-live="polite"
        aria-label={t('view.label')}
      >
        <div style={COLUMN}>
          <div style={USER_ROW}>
            <div style={USER_COLUMN}>
              <div style={META}>{metaLine(task, t)}</div>
              <div style={USER_BUBBLE}>
                {task.prompt !== undefined ? task.prompt : t('detail.promptMissing')}
              </div>
              {task.promptTruncated === true
                ? <div style={TRUNCATION}>{t('detail.truncated')}</div>
                : null}
            </div>
          </div>

          {claudeCode
            ? (
              <>
                {blocks.map((block, index) => (
                  <LogBlock key={index} block={block} t={t} />
                ))}

                {blocks.length === 0
                  ? (
                    <div style={PLACEHOLDER} role="status">
                      {state === 'loading' || running ? t('log.waiting') : t('log.empty')}
                    </div>
                  )
                  : null}

                {state === 'error'
                  ? (
                    <div style={NOTE} role="status">
                      {t('log.unavailable')}
                      {errorCode !== undefined ? ` (${errorCode})` : ''}
                    </div>
                  )
                  : null}

                {truncated ? <div style={NOTE}>{t('markdown.truncated')}</div> : null}

                {task.status !== 'pending'
                  ? (
                    <div>
                      <div style={SECTION_LABEL}>{t('conversation.result')}</div>
                      {resultText !== undefined
                        ? <MarkdownText text={resultText} labels={markdownLabels} />
                        : <div style={MUTED}>{t('conversation.emptyResult')}</div>}
                      {task.answerTruncated === true
                        ? <div style={TRUNCATION}>{t('detail.truncated')}</div>
                        : null}
                      {task.completedAt !== undefined
                        ? (
                          <div style={{ ...META, marginTop: 6, textAlign: 'left' }}>
                            {`${t('detail.completedAt')} ${formatTime(task.completedAt)}`}
                          </div>
                        )
                        : null}
                    </div>
                  )
                  : null}
              </>
            )
            : <div style={NOTE}>{t('page.unsupported')}</div>}
        </div>
      </div>
    </div>
  )
}
