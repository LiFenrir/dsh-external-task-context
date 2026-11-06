/**
 * Behavior tests for the pure trace aggregator.
 *
 * Fixtures mirror the on-disk shape: the DSH trace wraps raw SDK messages
 * under `kind: 'message'`.
 */
import { strict as assert } from 'node:assert'
import test from 'node:test'
import { summarizeDshLog } from '../src/client/log-stats.ts'

function lines(records: readonly unknown[]): string {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`
}

test('summarizeDshLog counts messages, tool blocks, last usage, cost, and times', () => {
  const text = lines([
    { kind: 'start', time: 1000, runId: 'run-1', cwd: '/repo', model: 'sonnet' },
    {
      kind: 'message',
      time: 1100,
      message: {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Reading the file' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/a.ts' } },
          ],
          usage: { input_tokens: 11, output_tokens: 3 },
        },
      },
    },
    {
      kind: 'message',
      time: 1200,
      message: {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'call-1', content: [{ type: 'text', text: 'body' }] },
          ],
        },
      },
    },
    {
      kind: 'message',
      time: 1300,
      message: {
        type: 'result',
        subtype: 'success',
        usage: { input_tokens: 120, output_tokens: 45 },
        total_cost_usd: 0.0123,
      },
    },
    { kind: 'end', time: 2000, status: 'completed', result: 'done' },
  ]) + '{broken\n'

  assert.deepEqual(summarizeDshLog(text), {
    messages: 1,
    toolCalls: 1,
    toolResults: 1,
    inputTokens: 120,
    outputTokens: 45,
    costUsd: 0.0123,
    startedAt: 1000,
    endedAt: 2000,
  })
})

test('empty and malformed input yields zeroed statistics', () => {
  assert.deepEqual(summarizeDshLog(''), {
    messages: 0,
    toolCalls: 0,
    toolResults: 0,
    inputTokens: 0,
    outputTokens: 0,
  })
  assert.deepEqual(summarizeDshLog('{nope\n[]\n42\n'), {
    messages: 0,
    toolCalls: 0,
    toolResults: 0,
    inputTokens: 0,
    outputTokens: 0,
  })
})
