/**
 * Host entry: register the external-task context projection.
 *
 * The unit reads only already-recorded session events; it adds no event type
 * and changes no model-visible behavior.
 */
import type { Context } from '@deepseek-ai/cordis'
import { externalTaskContextProjection } from './host/projection.ts'

export const name = 'dsh-external-task-context'
export const inject = ['sessionProjections']

/**
 * Register the projection on the calling context's fiber.
 * @param ctx - host context carrying the session-projection registry.
 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.sessionProjections.register(externalTaskContextProjection)
}
