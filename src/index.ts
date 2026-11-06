/**
 * Host entry: register the external-task context projection and the run-log
 * Fetch route.
 *
 * The projection reads only already-recorded session events; the route serves
 * the two raw Claude Code traces on demand. Neither changes model-visible
 * behavior.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { externalTaskContextProjection } from './host/projection.ts'
import {
  isRunLogId,
  isRunLogSource,
  readRunLog,
  RunLogError,
  type RunLogErrorCode,
} from './host/run-logs.ts'

export const name = 'dsh-external-task-context'
export const inject = ['sessionProjections', 'connection']

/** Authenticated route serving one run trace. */
const LOG_PATH = '/api/external-task-context/log'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function errorResponse(status: number, code: RunLogErrorCode, message: string): Response {
  return jsonResponse(status, { ok: false, error: { code, message } })
}

/** Map a reader failure to its HTTP status. */
function statusOf(code: RunLogErrorCode): number {
  switch (code) {
    case 'invalid-request': return 400
    case 'log-not-found': return 404
    case 'transcript-not-found': return 404
    case 'read-failed': return 500
    default: return 500
  }
}

/** Read the `childId`, `source`, and `offset` query parameters. */
function parseQuery(url: URL):
  | { ok: true; childId: string; source: 'dsh' | 'native'; offset: number }
  | { ok: false; response: Response } {
  const childId = url.searchParams.get('childId')
  if (childId === null || !isRunLogId(childId)) {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', 'childId must be a lowercase UUID.'),
    }
  }

  const source = url.searchParams.get('source') ?? 'dsh'
  if (!isRunLogSource(source)) {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', 'source must be "dsh" or "native".'),
    }
  }

  const rawOffset = url.searchParams.get('offset') ?? '0'
  if (!/^\d+$/.test(rawOffset)) {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', 'offset must be a non-negative integer.'),
    }
  }
  const offset = Number(rawOffset)
  if (!Number.isSafeInteger(offset)) {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', 'offset must be a non-negative integer.'),
    }
  }

  return { ok: true, childId, source, offset }
}

/** Serve one incremental read of a run trace. */
async function handleLog(request: Request): Promise<Response> {
  try {
    const query = parseQuery(new URL(request.url))
    if (!query.ok) return query.response

    try {
      const value = await readRunLog(query.childId, query.source, query.offset)
      return jsonResponse(200, { ok: true, value })
    } catch (cause) {
      if (cause instanceof RunLogError) {
        return errorResponse(statusOf(cause.code), cause.code, cause.message)
      }
      return errorResponse(500, 'read-failed', 'The log could not be read.')
    }
  } catch {
    return errorResponse(500, 'read-failed', 'The log request failed.')
  }
}

/**
 * Register the projection and the authenticated run-log route on the calling
 * context's fiber.
 * @param ctx - host context carrying the projection registry and connection.
 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.sessionProjections.register(externalTaskContextProjection)
  ctx.effect(() => ctx.connection.fetch.register({
    path: LOG_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: handleLog,
  }), 'external-task-context: run-log route')
}
