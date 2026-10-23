/**
 * Host fold for external task context.
 *
 * External providers (Claude Code, Codex, ACP) run out of process, so the
 * child has no local Session and no transcript. The parent log still records
 * everything this plugin shows: the delegation `tool/call`, the external
 * `subagent/catalog` v2 entry that introduces the child id, and the later
 * `subagent-settled` notice carrying the terminal summary and closing text.
 * The fold reads only those existing events.
 *
 * The projection owns no subscription. The session-projection registry drives
 * {@link applyExternalTaskEvent} for every committed event; an uninteresting
 * event returns the same state reference so the framework publishes nothing.
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-subagent'
import {
  EXTERNAL_TASK_CONTEXTS,
  type ExternalTaskContextState,
  type ExternalTaskContextView,
  type ExternalTaskOptions,
  type ExternalTaskStatus,
  type PendingDelegation,
} from '../shared/projection.ts'
import { answerFromSettlementContent, statusFromSettlementSummary } from './settlement.ts'
import { boundText } from './text.ts'

/** Newest unpaired delegations retained; older ones are discarded. */
const MAX_PENDING_DELEGATIONS = 20

const STATE_LABEL = 'externalTaskContexts'
const VIEW_LABEL = 'externalTaskContexts view'

const STATUS_VALUES: ReadonlySet<string> = new Set<ExternalTaskStatus>([
  'pending',
  'completed',
  'aborted',
  'max-tokens',
  'refusal',
  'error',
  'unknown',
])

/** Empty fold state for one session log. */
export function initialState(inheritedEventCount: number): ExternalTaskContextState {
  return { inheritedEventCount, tasks: [], pending: [] }
}

/**
 * Fold one committed session event into the external-task projection.
 *
 * @param state - state covering all prior events.
 * @param event - the next committed event.
 * @returns the next state, or the same reference when the event is unrelated.
 */
export function applyExternalTaskEvent(
  state: ExternalTaskContextState,
  event: SessionEvent,
): ExternalTaskContextState {
  // Fork-inherited history belongs to the ancestor session; mirrors the
  // subagent catalog projection so inherited delegations are not re-attributed.
  if (event.seq < state.inheritedEventCount) return state

  switch (event.type) {
    case 'tool/call': return foldToolCall(state, event)
    case 'subagent/catalog': return foldCatalog(state, event)
    case 'user/message': return foldSettlement(state, event)
    default: return state
  }
}

/**
 * Current client view: tasks in catalog (creation) order.
 *
 * @param state - current fold state.
 * @returns the state's task array by reference.
 */
export function viewExternalTaskContexts(state: ExternalTaskContextState): ExternalTaskContextView[] {
  // The wire contract types the array as mutable; the fold never mutates it.
  return state.tasks as unknown as ExternalTaskContextView[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read a non-empty string field from model-authored tool arguments. */
function nonEmptyString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readOptions(record: Record<string, unknown>): ExternalTaskOptions | undefined {
  const provider = nonEmptyString(record, 'provider')
  const model = nonEmptyString(record, 'model')
  const reasoningEffort = nonEmptyString(record, 'reasoning_effort')
  const agentPreset = nonEmptyString(record, 'agent_preset')
  if (provider === undefined && model === undefined
    && reasoningEffort === undefined && agentPreset === undefined) {
    return undefined
  }
  return {
    ...(provider !== undefined ? { provider } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
    ...(agentPreset !== undefined ? { agentPreset } : {}),
  }
}

function foldToolCall(
  state: ExternalTaskContextState,
  event: SessionEvent<'tool/call'>,
): ExternalTaskContextState {
  let parsed: unknown
  try {
    parsed = JSON.parse(event.data.arguments)
  } catch {
    // A malformed model-authored argument string is not a delegation record.
    return state
  }
  if (!isRecord(parsed)) return state

  const label = nonEmptyString(parsed, 'description')
  const prompt = nonEmptyString(parsed, 'prompt')
  if (label === undefined || prompt === undefined) return state

  const bounded = boundText(prompt)
  const cwd = nonEmptyString(parsed, 'cwd')
  const options = readOptions(parsed)
  const pending: PendingDelegation = {
    callId: event.data.callId,
    tool: event.data.name,
    time: event.time,
    label,
    prompt: bounded.text,
    ...(bounded.truncated ? { promptTruncated: true } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(options !== undefined ? { options } : {}),
  }

  return {
    ...state,
    pending: [...state.pending, pending].slice(-MAX_PENDING_DELEGATIONS),
  }
}

/**
 * Pair one pending delegation with a catalog entry.
 *
 * A label match is unambiguous and wins even with several candidates. Without
 * one, a single remaining pending entry is assumed to be the delegation;
 * several candidates are left unattached rather than guessed at.
 */
function takePending(
  pending: readonly PendingDelegation[],
  label: string | undefined,
): PendingDelegation | undefined {
  if (label !== undefined) {
    const labelled = pending.find(entry => entry.label === label)
    if (labelled !== undefined) return labelled
  }
  return pending.length === 1 ? pending[0] : undefined
}

function foldCatalog(
  state: ExternalTaskContextState,
  event: SessionEvent<'subagent/catalog'>,
): ExternalTaskContextState {
  const data = event.data
  if (data.version !== 2 || data.mode !== 'external') return state
  if (state.tasks.some(task => task.id === data.childId)) return state

  const pending = takePending(state.pending, data.label)
  const task: ExternalTaskContextView = {
    id: data.childId,
    createdAt: data.childCreatedAt,
    status: 'pending',
    ...(data.label !== undefined ? { label: data.label } : {}),
    ...(pending === undefined ? {} : {
      tool: pending.tool,
      ...(pending.prompt !== undefined ? { prompt: pending.prompt } : {}),
      ...(pending.promptTruncated === true ? { promptTruncated: true } : {}),
      ...(pending.cwd !== undefined ? { cwd: pending.cwd } : {}),
      ...(pending.options !== undefined ? { options: pending.options } : {}),
    }),
  }

  return {
    ...state,
    tasks: [...state.tasks, task],
    pending: pending === undefined ? state.pending : state.pending.filter(entry => entry !== pending),
  }
}

function foldSettlement(
  state: ExternalTaskContextState,
  event: SessionEvent<'user/message'>,
): ExternalTaskContextState {
  const source = event.data.source
  if (source.kind !== 'subagent-settled') return state

  const childId = source.senderSessionId
  if (!state.tasks.some(task => task.id === childId)) return state

  // The summary is a durable field; the `typeof` guard keeps a malformed
  // restored notice from throwing instead of projecting an unknown ending.
  const sourceSummary = typeof source.summary === 'string' ? source.summary : ''
  const extracted = answerFromSettlementContent(event.data.content)
  const rawSummary = sourceSummary.length > 0 ? sourceSummary : extracted.summary
  const summary = rawSummary !== undefined && rawSummary.length > 0 ? boundText(rawSummary) : undefined
  const answer = extracted.answer !== undefined && extracted.answer.length > 0
    ? boundText(extracted.answer)
    : undefined
  const status = statusFromSettlementSummary(sourceSummary)

  return {
    ...state,
    tasks: state.tasks.map((task): ExternalTaskContextView => {
      if (task.id !== childId) return task
      // Rebuild the result fields instead of spreading the old task: a
      // repeated settlement must not retain a previous answer or truncation
      // flag when the new notice carries none.
      return {
        id: task.id,
        createdAt: task.createdAt,
        status,
        completedAt: event.time,
        ...(task.label !== undefined ? { label: task.label } : {}),
        ...(task.tool !== undefined ? { tool: task.tool } : {}),
        ...(task.prompt !== undefined ? { prompt: task.prompt } : {}),
        ...(task.promptTruncated !== undefined ? { promptTruncated: task.promptTruncated } : {}),
        ...(task.cwd !== undefined ? { cwd: task.cwd } : {}),
        ...(task.options !== undefined ? { options: task.options } : {}),
        ...(summary !== undefined ? { summary: summary.text } : {}),
        ...(answer !== undefined
          ? { answer: answer.text, ...(answer.truncated ? { answerTruncated: true } : {}) }
          : {}),
      }
    }),
  }
}

function expectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${STATE_LABEL}: ${field} must be an object`)
  return value
}

function expectString(record: Record<string, unknown>, field: string, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a string`)
  return value
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
  key: string,
): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a string`)
  return value
}

function optionalBoolean(
  record: Record<string, unknown>,
  field: string,
  key: string,
): boolean | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a boolean`)
  return value
}

function expectNumber(record: Record<string, unknown>, field: string, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a finite number`)
  }
  return value
}

function optionalNumber(
  record: Record<string, unknown>,
  field: string,
  key: string,
): number | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field}.${key} must be a finite number`)
  }
  return value
}

function parseStatus(value: unknown, field: string): ExternalTaskStatus {
  if (typeof value !== 'string' || !STATUS_VALUES.has(value)) {
    throw new TypeError(`${STATE_LABEL}: ${field} is not a known status`)
  }
  return value as ExternalTaskStatus
}

function parseOptions(value: unknown, field: string): ExternalTaskOptions | undefined {
  if (value === undefined) return undefined
  const record = expectRecord(value, `${field}.options`)
  const provider = optionalString(record, `${field}.options`, 'provider')
  const model = optionalString(record, `${field}.options`, 'model')
  const reasoningEffort = optionalString(record, `${field}.options`, 'reasoningEffort')
  const agentPreset = optionalString(record, `${field}.options`, 'agentPreset')
  return {
    ...(provider !== undefined ? { provider } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
    ...(agentPreset !== undefined ? { agentPreset } : {}),
  }
}

function parseTask(value: unknown, field: string): ExternalTaskContextView {
  const record = expectRecord(value, field)
  const label = optionalString(record, field, 'label')
  const tool = optionalString(record, field, 'tool')
  const prompt = optionalString(record, field, 'prompt')
  const promptTruncated = optionalBoolean(record, field, 'promptTruncated')
  const cwd = optionalString(record, field, 'cwd')
  const summary = optionalString(record, field, 'summary')
  const answer = optionalString(record, field, 'answer')
  const answerTruncated = optionalBoolean(record, field, 'answerTruncated')
  const completedAt = optionalNumber(record, field, 'completedAt')
  return {
    id: expectString(record, field, 'id'),
    createdAt: expectNumber(record, field, 'createdAt'),
    status: parseStatus(record.status, `${field}.status`),
    ...(label !== undefined ? { label } : {}),
    ...(tool !== undefined ? { tool } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
    ...(promptTruncated !== undefined ? { promptTruncated } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(record.options !== undefined ? { options: parseOptions(record.options, field) } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(answer !== undefined ? { answer } : {}),
    ...(answerTruncated !== undefined ? { answerTruncated } : {}),
    ...(completedAt !== undefined ? { completedAt } : {}),
  }
}

function parsePending(value: unknown, field: string): PendingDelegation {
  const record = expectRecord(value, field)
  const label = optionalString(record, field, 'label')
  const prompt = optionalString(record, field, 'prompt')
  const promptTruncated = optionalBoolean(record, field, 'promptTruncated')
  const cwd = optionalString(record, field, 'cwd')
  return {
    callId: expectString(record, field, 'callId'),
    tool: expectString(record, field, 'tool'),
    time: expectNumber(record, field, 'time'),
    ...(label !== undefined ? { label } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
    ...(promptTruncated !== undefined ? { promptTruncated } : {}),
    ...(cwd !== undefined ? { cwd } : {}),
    ...(record.options !== undefined ? { options: parseOptions(record.options, field) } : {}),
  }
}

/**
 * Strict validator for persisted fold state. Unknown fields are dropped by
 * rebuilding every object from the fields this unit owns.
 */
const stateSchema = {
  parse(value: unknown): ExternalTaskContextState {
    const record = expectRecord(value, 'state')
    const inheritedEventCount = record.inheritedEventCount
    if (typeof inheritedEventCount !== 'number'
      || !Number.isInteger(inheritedEventCount)
      || inheritedEventCount < 0) {
      throw new TypeError(`${STATE_LABEL}: inheritedEventCount must be a non-negative integer`)
    }
    const tasks = record.tasks
    if (!Array.isArray(tasks)) throw new TypeError(`${STATE_LABEL}: tasks must be an array`)
    const pending = record.pending
    if (!Array.isArray(pending)) throw new TypeError(`${STATE_LABEL}: pending must be an array`)
    return {
      inheritedEventCount,
      tasks: tasks.map((item, index) => parseTask(item, `tasks[${index}]`)),
      pending: pending.map((item, index) => parsePending(item, `pending[${index}]`)),
    }
  },
}

/**
 * Validator for the wire view. Items are checked but not rebuilt, so the
 * validated array keeps the exact reference the fold returned.
 */
const viewSchema = {
  parse(value: unknown): ExternalTaskContextView[] {
    if (!Array.isArray(value)) throw new TypeError(`${VIEW_LABEL}: expected an array`)
    value.forEach((item, index) => { parseTask(item, `tasks[${index}]`) })
    return value as ExternalTaskContextView[]
  },
}

type ExternalTaskProjectionDefinition =
  ProjectionDefinition<'externalTaskContexts', ExternalTaskContextState>
type ExternalTaskProjection = Omit<ExternalTaskProjectionDefinition, 'wire'> & {
  wire: NonNullable<ExternalTaskProjectionDefinition['wire']>
}

/** Registered unit: pure synchronous fold plus its client view. */
export const externalTaskContextProjection: ExternalTaskProjection = {
  key: EXTERNAL_TASK_CONTEXTS,
  stateSchema: stateSchema as unknown as ExternalTaskProjectionDefinition['stateSchema'],
  init: (_header, inheritedEventCount) => initialState(inheritedEventCount),
  apply: applyExternalTaskEvent,
  wire: {
    viewSchema: viewSchema as unknown as NonNullable<ExternalTaskProjectionDefinition['wire']>['viewSchema'],
    view: viewExternalTaskContexts,
  },
  stateVersion: 1,
}
