/**
 * Behavior tests for the external-task fold. Fixtures are plain objects cast
 * to `SessionEvent`; the fold only reads the fields named in its contract.
 */
import { strict as assert } from 'node:assert'
import test from 'node:test'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import {
  applyExternalTaskEvent,
  initialState,
  viewExternalTaskContexts,
} from '../src/host/projection.ts'
import type { ExternalTaskContextState } from '../src/shared/projection.ts'
import { MAX_CONTEXT_TEXT_BYTES } from '../src/host/text.ts'

function event(input: { type: string; seq: number; time: number; data: unknown }): SessionEvent {
  return input as unknown as SessionEvent
}

function toolCall(seq: number, time: number, args: Record<string, unknown>): SessionEvent {
  return event({
    type: 'tool/call',
    seq,
    time,
    data: {
      turn: 0,
      step: 0,
      callId: `call-${seq}`,
      name: 'task',
      arguments: JSON.stringify(args),
    },
  })
}

function catalog(
  seq: number,
  time: number,
  data: Record<string, unknown>,
): SessionEvent {
  return event({
    type: 'subagent/catalog',
    seq,
    time,
    data: { childId: 'child-1', childCreatedAt: time, ...data },
  })
}

function settlement(
  seq: number,
  time: number,
  childId: string,
  summary: string,
  body: readonly string[],
): SessionEvent {
  return event({
    type: 'user/message',
    seq,
    time,
    data: {
      id: `message-${seq}`,
      role: 'user',
      content: [summary, ...body].map(text => ({ type: 'text', text })),
      source: {
        kind: 'subagent-settled',
        form: 'notice',
        summary,
        senderSessionId: childId,
      },
      surfaceOp: 'append',
    },
  })
}

function delegatedState(prompt = 'Please review the repository.'): ExternalTaskContextState {
  const withCall = applyExternalTaskEvent(initialState(0), toolCall(0, 1000, {
    description: 'Review code',
    prompt,
    cwd: '/repo',
    provider: 'claude-code',
    model: 'claude-sonnet-4',
    reasoning_effort: 'high',
    agent_preset: 'reviewer',
  }))
  return applyExternalTaskEvent(
    withCall,
    catalog(1, 1100, { version: 2, mode: 'external', label: 'Review code' }),
  )
}

test('records prompt, context, and options from tool/call plus catalog v2', () => {
  const state = delegatedState()
  const tasks = viewExternalTaskContexts(state)
  assert.equal(tasks.length, 1)
  const task = tasks[0]!
  assert.equal(task.id, 'child-1')
  assert.equal(task.label, 'Review code')
  assert.equal(task.prompt, 'Please review the repository.')
  assert.equal(task.cwd, '/repo')
  assert.deepEqual(task.options, {
    provider: 'claude-code',
    model: 'claude-sonnet-4',
    reasoningEffort: 'high',
    agentPreset: 'reviewer',
  })
  assert.equal(task.tool, 'task')
  assert.equal(task.createdAt, 1100)
  assert.equal(task.status, 'pending')
  assert.equal(state.pending.length, 0)
})

test('ignores local one-shot and continuable catalog entries', () => {
  const empty = initialState(0)
  const oneShot = applyExternalTaskEvent(empty, catalog(0, 1000, {
    version: 0,
    mode: 'one-shot',
    label: 'Local task',
  }))
  const continuable = applyExternalTaskEvent(empty, catalog(0, 1000, {
    version: 0,
    mode: 'continuable',
    label: 'Local task',
  }))

  assert.equal(oneShot, empty)
  assert.equal(continuable, empty)
})

test('ignores events below the inherited event count', () => {
  const state = initialState(5)
  const inheritedCall = toolCall(4, 1000, { description: 'Old', prompt: 'Old prompt' })
  const inheritedCatalog = catalog(4, 1000, {
    version: 2,
    mode: 'external',
    label: 'Old',
  })

  assert.equal(applyExternalTaskEvent(state, inheritedCall), state)
  assert.equal(applyExternalTaskEvent(state, inheritedCatalog), state)
})

test('completed settlement records status, answer, summary, and completion time', () => {
  const summary = 'Background subagent child-1 finished. It cannot receive follow-up messages.'
  const state = applyExternalTaskEvent(
    delegatedState(),
    settlement(2, 2000, 'child-1', summary, ['Its closing message:', 'Done reviewing.']),
  )
  const task = viewExternalTaskContexts(state)[0]!

  assert.equal(task.status, 'completed')
  assert.equal(task.summary, summary)
  assert.equal(task.answer, 'Done reviewing.')
  assert.equal(task.completedAt, 2000)
  assert.equal(task.prompt, 'Please review the repository.')
})

test('failure settlement marks error and preserves diagnostic text', () => {
  const summary = 'Background subagent child-1 failed before it finished.'
  const state = applyExternalTaskEvent(
    delegatedState(),
    settlement(2, 2000, 'child-1', summary, [
      'Its closing message:',
      'Partial output.',
      'Error: provider exited unexpectedly.',
    ]),
  )
  const task = viewExternalTaskContexts(state)[0]!

  assert.equal(task.status, 'error')
  assert.equal(task.answer, 'Partial output.\n\nError: provider exited unexpectedly.')
})

test('no closing message records no answer', () => {
  const summary = 'Background subagent child-1 finished. It cannot receive follow-up messages.'
  const state = applyExternalTaskEvent(
    delegatedState(),
    settlement(2, 2000, 'child-1', summary, ['It left no closing message.']),
  )
  const task = viewExternalTaskContexts(state)[0]!

  assert.equal(task.status, 'completed')
  assert.equal(task.answer, undefined)
})

test('an unrelated event returns the exact same state object', () => {
  const state = delegatedState()
  const unrelated = event({
    type: 'user/message',
    seq: 2,
    time: 2000,
    data: {
      id: 'message-2',
      role: 'user',
      content: [{ type: 'text', text: 'A human message.' }],
      source: { kind: 'user' },
      surfaceOp: 'append',
    },
  })

  assert.equal(applyExternalTaskEvent(state, unrelated), state)
})

test('an over-long prompt is truncated without splitting UTF-8', () => {
  // The leading ASCII byte makes the cut land inside an emoji's 4-byte
  // sequence, exercising the continuation-byte back-off.
  const prompt = `a${'🙂'.repeat(20000)}`
  const state = delegatedState(prompt)
  const task = viewExternalTaskContexts(state)[0]!

  assert.equal(task.promptTruncated, true)
  assert.notEqual(task.prompt, undefined)
  const truncated = task.prompt!
  assert.ok(truncated.length < prompt.length)
  assert.ok(new TextEncoder().encode(truncated).byteLength <= MAX_CONTEXT_TEXT_BYTES)
  // A fatal decode proves the prefix ends on a code-point boundary.
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(truncated))
  assert.equal(decoded, truncated)
})

test('ambiguous pending delegations are not attached to a catalog entry', () => {
  let state = initialState(0)
  state = applyExternalTaskEvent(state, toolCall(0, 1000, {
    description: 'First task',
    prompt: 'Do the first thing.',
  }))
  state = applyExternalTaskEvent(state, toolCall(1, 1001, {
    description: 'Second task',
    prompt: 'Do the second thing.',
  }))
  state = applyExternalTaskEvent(state, catalog(2, 1100, {
    version: 2,
    mode: 'external',
    label: 'Unmatched label',
  }))

  const task = viewExternalTaskContexts(state)[0]!
  assert.equal(task.prompt, undefined)
  assert.equal(task.options, undefined)
  assert.equal(task.label, 'Unmatched label')
  assert.equal(state.pending.length, 2)
})

test('view returns the state task array by reference', () => {
  const state = delegatedState()
  assert.equal(viewExternalTaskContexts(state), state.tasks)
})
