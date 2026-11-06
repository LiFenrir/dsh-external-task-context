/**
 * Behavior tests for the pure DSH trace renderer.
 *
 * Fixtures mirror the on-disk shape: the DSH trace wraps raw SDK messages
 * under `kind: 'message'`.
 */
import { strict as assert } from 'node:assert'
import test from 'node:test'
import {
  MAX_BLOCK_CHARS,
  TRUNCATION_NOTE,
  dshLogToMarkdown,
} from '../src/client/log-markdown.ts'

function lines(records: readonly unknown[]): string {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`
}

test('dshLogToMarkdown maps the trace to ordered blocks', () => {
  const text = lines([
    { kind: 'start', time: 1, runId: 'run-1', cwd: '/repo', model: 'sonnet' },
    {
      kind: 'message',
      time: 2,
      message: {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Looking at the file' },
            { type: 'thinking', thinking: 'The path is relative' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/a.ts' } },
          ],
        },
      },
    },
    {
      kind: 'message',
      time: 3,
      message: {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'x', content: [{ type: 'text', text: 'file body' }] }],
        },
      },
    },
    {
      kind: 'message',
      time: 4,
      message: {
        type: 'result',
        subtype: 'success',
        num_turns: 2,
        total_cost_usd: 0.0123,
        duration_ms: 1500,
      },
    },
    { kind: 'end', time: 5, status: 'completed', result: 'done' },
  ])

  const blocks = dshLogToMarkdown(text)
  assert.deepEqual(blocks.map(block => block.kind), [
    'meta',
    'assistantText',
    'thinking',
    'tool',
    'toolResult',
    'result',
    'meta',
  ])

  assert.ok(blocks[0]!.markdown.startsWith('> ▶'))
  assert.ok(blocks[0]!.markdown.includes('cwd: /repo'))
  assert.ok(blocks[0]!.markdown.includes('model: sonnet'))
  assert.equal(blocks[1]!.markdown, 'Looking at the file')

  const thinking = blocks[2]!
  assert.equal(thinking.title, '思考')
  assert.equal(thinking.collapsible, true)
  assert.equal(thinking.defaultOpen, false)
  assert.ok(thinking.markdown.startsWith('> The path is relative'))

  const tool = blocks[3]!
  assert.equal(tool.collapsible, true)
  assert.equal(tool.defaultOpen, false)
  assert.equal(tool.title, '→ Read · /a.ts')
  assert.ok(tool.markdown.startsWith('```json'))
  assert.ok(tool.markdown.includes('"file_path": "/a.ts"'))

  const toolResult = blocks[4]!
  assert.equal(toolResult.title, '← 结果')
  assert.equal(toolResult.collapsible, true)
  assert.equal(toolResult.defaultOpen, false)
  assert.ok(toolResult.markdown.startsWith('```text'))
  assert.ok(toolResult.markdown.includes('file body'))
  assert.ok(toolResult.markdown.endsWith('```'))

  const result = blocks[5]!.markdown
  assert.ok(result.startsWith('> ✔ success'))
  assert.ok(result.includes('2 turns'))
  assert.ok(result.includes('$0.0123'))
  assert.ok(result.includes('1500ms'))

  assert.equal(blocks[6]!.markdown, '> ■ completed')
})

test('dshLogToMarkdown renders system init and skips unknown messages', () => {
  const text = lines([
    { kind: 'message', time: 1, message: { type: 'system', subtype: 'init', model: 'opus', tools: ['Read', 'Write'] } },
    { kind: 'message', time: 2, message: { type: 'stream_event', event: { type: 'content_block_delta' } } },
  ])

  const blocks = dshLogToMarkdown(text)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.kind, 'meta')
  assert.ok(blocks[0]!.markdown.includes('模型 opus'))
  assert.ok(blocks[0]!.markdown.includes('2 tools'))
})

test('dshLogToMarkdown truncates one oversized entry and marks the cut', () => {
  const text = lines([
    {
      kind: 'message',
      time: 1,
      message: {
        type: 'user',
        message: { content: [{ type: 'tool_result', content: 'x'.repeat(20000) }] },
      },
    },
  ])

  const blocks = dshLogToMarkdown(text)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.kind, 'toolResult')
  assert.ok(blocks[0]!.markdown.includes(TRUNCATION_NOTE))
  assert.ok(blocks[0]!.markdown.length <= MAX_BLOCK_CHARS)
})

test('dshLogToMarkdown still renders the flat legacy message shape', () => {
  const text = lines([{
    kind: 'message',
    time: 1,
    message: { type: 'assistant', content: [{ type: 'text', text: 'legacy hi' }] },
  }])

  const blocks = dshLogToMarkdown(text)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.kind, 'assistantText')
  assert.equal(blocks[0]!.markdown, 'legacy hi')
})

test('Edit renders a fileChange with two context lines around the hunk', () => {
  const oldText = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'].join('\n')
  const newText = ['alpha', 'beta', 'GAMMA', 'delta', 'epsilon', 'zeta', 'eta', 'theta'].join('\n')
  const text = lines([{
    kind: 'message',
    time: 1,
    message: {
      type: 'assistant',
      message: {
        content: [{
          type: 'tool_use',
          name: 'Edit',
          input: { file_path: '/a.ts', old_string: oldText, new_string: newText },
        }],
      },
    },
  }])

  const blocks = dshLogToMarkdown(text)
  assert.equal(blocks.length, 1)
  const block = blocks[0]!
  assert.equal(block.kind, 'fileChange')
  assert.equal(block.title, '→ Edit /a.ts')
  assert.equal(block.change?.path, '/a.ts')
  assert.equal(block.change?.tool, 'Edit')
  assert.equal(block.change?.truncated, false)
  assert.deepEqual(block.change?.lines.map(line => line.kind), [
    'context',
    'context',
    'del',
    'add',
    'context',
    'context',
  ])
  assert.deepEqual(block.change?.lines.map(line => line.text), [
    'alpha',
    'beta',
    'gamma',
    'GAMMA',
    'delta',
    'epsilon',
  ])
})

test('Edit collapses a changed hunk longer than 30 lines', () => {
  const oldText = Array.from({ length: 40 }, (_, index) => `old-${index}`).join('\n')
  const newText = Array.from({ length: 40 }, (_, index) => `new-${index}`).join('\n')
  const text = lines([{
    kind: 'message',
    time: 1,
    message: {
      type: 'assistant',
      message: {
        content: [{
          type: 'tool_use',
          name: 'Edit',
          input: { file_path: '/a.ts', old_string: oldText, new_string: newText },
        }],
      },
    },
  }])

  const change = dshLogToMarkdown(text)[0]!.change
  assert.equal(change?.truncated, true)
  assert.deepEqual(change?.lines.map(line => line.kind), ['del', 'del', 'context', 'add', 'add'])
  assert.equal(change?.lines[2]!.text, TRUNCATION_NOTE)
  assert.equal(change?.lines[3]!.text, 'new-38')
  assert.equal(change?.lines[4]!.text, 'new-39')
})

test('Write keeps the head and tail of long content', () => {
  const content = Array.from({ length: 50 }, (_, index) => `line-${index}`).join('\n')
  const text = lines([{
    kind: 'message',
    time: 1,
    message: {
      type: 'assistant',
      message: {
        content: [{
          type: 'tool_use',
          name: 'Write',
          input: { file_path: '/new.ts', content },
        }],
      },
    },
  }])

  const block = dshLogToMarkdown(text)[0]!
  assert.equal(block.kind, 'fileChange')
  assert.equal(block.change?.truncated, true)
  assert.equal(block.change?.lines.length, 13)
  assert.equal(block.change?.lines[0]!.text, 'line-0')
  assert.equal(block.change?.lines[9]!.text, 'line-9')
  assert.equal(block.change?.lines[10]!.kind, 'context')
  assert.equal(block.change?.lines[10]!.text, TRUNCATION_NOTE)
  assert.equal(block.change?.lines[11]!.text, 'line-48')
  assert.equal(block.change?.lines[12]!.text, 'line-49')
  assert.ok(block.change?.lines.every(line => line.kind === 'add' || line.kind === 'context'))
})

test('a short Write renders every line as added without truncation', () => {
  const text = lines([{
    kind: 'message',
    time: 1,
    message: {
      type: 'assistant',
      message: {
        content: [{
          type: 'tool_use',
          name: 'Write',
          input: { file_path: '/new.ts', content: 'one\ntwo\nthree' },
        }],
      },
    },
  }])

  const change = dshLogToMarkdown(text)[0]!.change
  assert.equal(change?.truncated, false)
  assert.deepEqual(change?.lines.map(line => line.kind), ['add', 'add', 'add'])
  assert.deepEqual(change?.lines.map(line => line.text), ['one', 'two', 'three'])
})

test('dshLogToMarkdown skips malformed JSON instead of throwing', () => {
  const valid = JSON.stringify({
    kind: 'message',
    time: 1,
    message: { type: 'assistant', message: { content: [{ type: 'text', text: 'kept' }] } },
  })

  const blocks = dshLogToMarkdown(`{not json\n${valid}\n[1,2,3]\n`)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.markdown, 'kept')
})
