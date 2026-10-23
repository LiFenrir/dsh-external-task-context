/**
 * Projection vocabulary shared by the host fold and the client view.
 *
 * This module is deliberately type-only apart from the projection key: it may
 * be imported by a bundled client program, so it must not pull in host-side
 * runtime packages. Both projection tables are merge-extended here so the
 * host unit, the wire view, and `useProjection` agree on one key.
 */
declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    externalTaskContexts: ExternalTaskContextView[]
  }

  interface SessionProjectionStateMap {
    externalTaskContexts: ExternalTaskContextState
  }
}

/** Projection key owned by this plugin. */
export const EXTERNAL_TASK_CONTEXTS = 'externalTaskContexts' as const

/** Terminal or live state of one external delegation. */
export type ExternalTaskStatus =
  | 'pending'
  | 'completed'
  | 'aborted'
  | 'max-tokens'
  | 'refusal'
  | 'error'
  | 'unknown'

/** Runtime options recorded in the delegation tool call. */
export interface ExternalTaskOptions {
  readonly provider?: string
  readonly model?: string
  readonly reasoningEffort?: string
  readonly agentPreset?: string
}

/** One externally delegated task as rendered by the client. */
export interface ExternalTaskContextView {
  readonly id: string
  readonly label?: string
  readonly createdAt: number
  readonly tool?: string
  readonly prompt?: string
  readonly promptTruncated?: boolean
  readonly cwd?: string
  readonly options?: ExternalTaskOptions
  readonly status: ExternalTaskStatus
  readonly summary?: string
  readonly answer?: string
  readonly answerTruncated?: boolean
  readonly completedAt?: number
}

/** A delegation tool call that has not yet been paired with a catalog entry. */
export interface PendingDelegation {
  readonly callId: string
  readonly tool: string
  readonly time: number
  readonly label?: string
  readonly prompt?: string
  readonly promptTruncated?: boolean
  readonly cwd?: string
  readonly options?: ExternalTaskOptions
}

/** Host fold state persisted with the session projection cache. */
export interface ExternalTaskContextState {
  readonly inheritedEventCount: number
  readonly tasks: readonly ExternalTaskContextView[]
  readonly pending: readonly PendingDelegation[]
}
