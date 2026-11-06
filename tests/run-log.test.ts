/**
 * Behavior tests for the run-trace readers and the pure TUI parsers.
 *
 * The readers consume only `DSH_HOME` plus the conventional provider layout,
 * so every test runs against a throwaway home under the OS temp directory.
 */
import { strict as assert } from 'node:assert'
import test, { type TestContext } from 'node:test'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readRunLog, RunLogError } from '../src/host/run-logs.ts'
import { parseDshLog, parseNativeLog } from '../src/client/log-parse.ts'

const RUN_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SESSION_ID = '11111111-2222-4333-8444-555555555555'

function tempLogDir(t: TestContext): { home: string; logDir: string } {
  const home = mkdtempSync(join(tmpdir(), 'dsh-run-log-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  t.after(() => {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    rmSync(home, { recursive: true, force: true })
  })
  const logDir = join(home, 'logs', 'subagent-claude-code')
  mkdirSync(logDir, { recursive: true })
  return { home, logDir }
}

function rejectsWith(code: string) {
  return (error: unknown): boolean => error instanceof RunLogError && error.code === code
}

function dshLines(): string[] {
  return [
    JSON.stringify({ kind: 'start', time: 1, runId: RUN_ID, cwd: '/repo', model: 'sonnet' }),
    JSON.stringify({
      kind: 'message',
      time: 2,
      message: { type: 'assistant', content: [{ type: 'text', text: 'hello' }] },
    }),
    JSON.stringify({ kind: 'end', time: 3, status: 'completed', result: null }),
  ]
}

test('reads the dsh trace whole and continues from its offset', async (t) => {
  const { logDir } = tempLogDir(t)
  const file = join(logDir, `${RUN_ID}.jsonl`)
  const firstLines = dshLines()
  const firstText = `${firstLines.join('\n')}\n`
  writeFileSync(file, firstText)

  const first = await readRunLog(RUN_ID, 'dsh', 0)
  assert.equal(first.content, firstText)
  assert.equal(first.nextOffset, Buffer.byteLength(firstText))

  const empty = await readRunLog(RUN_ID, 'dsh', first.nextOffset)
  assert.deepEqual(empty, { content: '', nextOffset: first.nextOffset })

  const extra = `${JSON.stringify({ kind: 'end', time: 4, status: 'failed', result: 'boom' })}\n`
  writeFileSync(file, firstText + extra)
  const continuation = await readRunLog(RUN_ID, 'dsh', first.nextOffset)
  assert.deepEqual(continuation, {
    content: extra,
    nextOffset: Buffer.byteLength(firstText + extra),
  })
})

test('leaves a trailing partial line unread until it is terminated', async (t) => {
  const { logDir } = tempLogDir(t)
  const file = join(logDir, `${RUN_ID}.jsonl`)
  const complete = `${JSON.stringify({ kind: 'start', time: 1, cwd: '/repo', model: null })}\n`
  const partial = JSON.stringify({ kind: 'end', time: 2, status: 'completed', result: null })
  writeFileSync(file, complete + partial)

  const first = await readRunLog(RUN_ID, 'dsh', 0)
  assert.equal(first.content, complete)
  assert.equal(first.nextOffset, Buffer.byteLength(complete))

  writeFileSync(file, `${complete}${partial}\n`)
  const rest = await readRunLog(RUN_ID, 'dsh', first.nextOffset)
  assert.equal(rest.content, `${partial}\n`)
  assert.equal(rest.nextOffset, Buffer.byteLength(`${complete}${partial}\n`))
})

test('locates the native transcript through the meta sidecar', async (t) => {
  const { home, logDir } = tempLogDir(t)
  const configDir = join(home, '.claude')
  const transcriptDir = join(configDir, 'projects', 'some-project')
  mkdirSync(transcriptDir, { recursive: true })

  const transcript = `${JSON.stringify({
    type: 'assistant',
    timestamp: '2026-01-01T00:00:00.000Z',
    message: { content: [{ type: 'text', text: 'native hello' }] },
  })}\n`
  writeFileSync(join(transcriptDir, `${SESSION_ID}.jsonl`), transcript)
  writeFileSync(join(logDir, `${RUN_ID}.meta.json`), JSON.stringify({
    runId: RUN_ID,
    cwd: '/repo',
    model: 'sonnet',
    startedAt: 1,
    endedAt: 2,
    status: 'completed',
    claudeSessionId: SESSION_ID,
    claudeConfigDir: configDir,
  }))

  const chunk = await readRunLog(RUN_ID, 'native', 0)
  assert.equal(chunk.content, transcript)
  assert.equal(chunk.nextOffset, Buffer.byteLength(transcript))
})

test('rejects non-UUID ids and traversal attempts before reading files', async (t) => {
  tempLogDir(t)
  await assert.rejects(readRunLog('../escape', 'dsh', 0), rejectsWith('invalid-request'))
  await assert.rejects(readRunLog('../../etc/passwd', 'dsh', 0), rejectsWith('invalid-request'))
  await assert.rejects(readRunLog(RUN_ID.toUpperCase(), 'dsh', 0), rejectsWith('invalid-request'))
  await assert.rejects(readRunLog(RUN_ID, 'dsh', -1), rejectsWith('invalid-request'))
})

test('rejects a traversal session id from the meta sidecar', async (t) => {
  const { home, logDir } = tempLogDir(t)
  const configDir = join(home, '.claude')
  mkdirSync(join(configDir, 'projects', 'some-project'), { recursive: true })
  writeFileSync(join(logDir, `${RUN_ID}.meta.json`), JSON.stringify({
    claudeSessionId: '../../etc/passwd',
    claudeConfigDir: configDir,
  }))

  await assert.rejects(readRunLog(RUN_ID, 'native', 0), rejectsWith('transcript-not-found'))
})

test('reports missing dsh logs and native meta/transcripts with typed codes', async (t) => {
  const { home, logDir } = tempLogDir(t)

  await assert.rejects(readRunLog(RUN_ID, 'dsh', 0), rejectsWith('log-not-found'))
  await assert.rejects(readRunLog(RUN_ID, 'native', 0), rejectsWith('transcript-not-found'))

  const configDir = join(home, '.claude')
  writeFileSync(join(logDir, `${RUN_ID}.meta.json`), JSON.stringify({
    runId: RUN_ID,
    cwd: '/repo',
    model: 'sonnet',
    startedAt: 1,
    endedAt: 2,
    status: 'completed',
    claudeSessionId: SESSION_ID,
    claudeConfigDir: configDir,
  }))
  await assert.rejects(readRunLog(RUN_ID, 'native', 0), rejectsWith('transcript-not-found'))
})

test('parseDshLog extracts assistant text, tool use, tool output, and results', () => {
  const text = [
    JSON.stringify({ kind: 'start', time: 1, runId: RUN_ID, cwd: '/repo', model: 'sonnet' }),
    JSON.stringify({
      kind: 'message',
      time: 2,
      message: {
        type: 'assistant',
        uuid: 'u-1',
        session_id: SESSION_ID,
        message: {
          content: [
            { type: 'text', text: 'Looking at the file' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/a.ts' } },
          ],
        },
      },
    }),
    JSON.stringify({
      kind: 'message',
      time: 3,
      message: {
        type: 'user',
        uuid: 'u-2',
        session_id: SESSION_ID,
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'x', content: [{ type: 'text', text: 'file body' }] }],
        },
      },
    }),
    JSON.stringify({
      kind: 'message',
      time: 4,
      message: { type: 'result', subtype: 'success', num_turns: 2, total_cost_usd: 0.0123, duration_ms: 1500 },
    }),
    JSON.stringify({ kind: 'end', time: 5, status: 'completed', result: 'done' }),
  ].join('\n') + '\n'

  const lines = parseDshLog(text)
  assert.ok(lines.some(line => line.kind === 'text' && line.text === 'Looking at the file'))
  assert.ok(lines.some(line => line.kind === 'tool'
    && line.text.includes('→ Read')
    && line.text.includes('"file_path":"/a.ts"')))
  assert.ok(lines.some(line => line.kind === 'tool' && line.text.startsWith('← file body')))
  assert.ok(lines.some(line => line.kind === 'result'
    && line.text.startsWith('✔ success')
    && line.text.includes('2 turns')
    && line.text.includes('$0.0123')))
  assert.ok(lines.some(line => line.kind === 'end' && line.text === '■ completed'))
})

test('parseDshLog still renders the flat legacy message shape', () => {
  const text = `${JSON.stringify({
    kind: 'message',
    time: 2,
    message: { type: 'assistant', content: [{ type: 'text', text: 'legacy hi' }] },
  })}\n`

  const lines = parseDshLog(text)
  assert.equal(lines.length, 1)
  assert.equal(lines[0]!.kind, 'text')
  assert.equal(lines[0]!.text, 'legacy hi')
})

test('skips malformed JSON lines instead of throwing', () => {
  const valid = JSON.stringify({
    kind: 'message',
    time: 2,
    message: {
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'kept' }] },
    },
  })
  const lines = parseDshLog(`{not json\n${valid}\n[1,2,3]\n`)

  assert.equal(lines.length, 1)
  assert.equal(lines[0]!.text, 'kept')
})

test('parseNativeLog drops bookkeeping rows and keeps assistant text', () => {
  const text = [
    JSON.stringify({ type: 'queue-operation', operation: 'enqueue' }),
    JSON.stringify({ type: 'attachment', message: { content: 'ignored' } }),
    JSON.stringify({
      type: 'assistant',
      timestamp: '2026-01-01T00:00:01.000Z',
      message: { content: [{ type: 'text', text: 'native hello' }] },
    }),
    JSON.stringify({ type: 'summary', summary: 'Session summary' }),
    '{broken',
  ].join('\n') + '\n'

  const lines = parseNativeLog(text)
  assert.equal(lines.length, 2)
  assert.equal(lines[0]!.kind, 'text')
  assert.equal(lines[0]!.text, 'native hello')
  assert.equal(lines[1]!.kind, 'meta')
  assert.equal(lines[1]!.text, 'Σ Session summary')
})
