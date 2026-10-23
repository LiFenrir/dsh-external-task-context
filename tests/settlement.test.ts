/**
 * Tests for the pure settlement readers: runtime summary phrases and the
 * notice content layout.
 */
import { strict as assert } from 'node:assert'
import test from 'node:test'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import {
  answerFromSettlementContent,
  statusFromSettlementSummary,
} from '../src/host/settlement.ts'

test('maps every runtime settlement summary to its status', () => {
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 finished. It cannot receive follow-up messages.'),
    'completed',
  )
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 was stopped before it finished.'),
    'aborted',
  )
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 ran out of room before it finished.'),
    'max-tokens',
  )
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 declined the task.'),
    'refusal',
  )
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 failed before it finished.'),
    'error',
  )
  assert.equal(
    statusFromSettlementSummary('Background subagent child-1 ended abnormally (provider) before it finished.'),
    'unknown',
  )
  assert.equal(statusFromSettlementSummary('Something else happened.'), 'unknown')
})

test('extracts the summary and joined closing text', () => {
  const content: ContentBlock[] = [
    { type: 'text', text: 'Background subagent child-1 finished.' },
    { type: 'text', text: 'Its closing message:' },
    { type: 'text', text: 'First paragraph.' },
    { type: 'reasoning', text: 'not model-visible output' },
    { type: 'text', text: 'Second paragraph.' },
    { type: 'text', text: 'Structured result: {"ok":true}' },
    { type: 'text', text: 'diagnostic detail' },
  ]

  assert.deepEqual(answerFromSettlementContent(content), {
    summary: 'Background subagent child-1 finished.',
    answer: [
      'First paragraph.',
      'Second paragraph.',
      'Structured result: {"ok":true}',
      'diagnostic detail',
    ].join('\n\n'),
  })
})

test('treats "It left no closing message." as no answer', () => {
  const content: ContentBlock[] = [
    { type: 'text', text: 'Background subagent child-1 was stopped before it finished.' },
    { type: 'text', text: 'It left no closing message.' },
  ]

  assert.deepEqual(answerFromSettlementContent(content), {
    summary: 'Background subagent child-1 was stopped before it finished.',
  })
})

test('returns only the summary when there are no closing blocks', () => {
  const content: ContentBlock[] = [
    { type: 'text', text: 'Background subagent child-1 declined the task.' },
    { type: 'text', text: 'Its closing message:' },
  ]

  assert.deepEqual(answerFromSettlementContent(content), {
    summary: 'Background subagent child-1 declined the task.',
  })
})

test('returns nothing for content without text blocks', () => {
  const content: ContentBlock[] = [
    { type: 'reasoning', text: 'private reasoning' },
  ]

  assert.deepEqual(answerFromSettlementContent(content), {})
})
