/**
 * Client entry: dictionary and the `conversation.view` entry.
 *
 * The entry joins the session header's View tab row (对话 / 轨迹 / …) and
 * renders inside the session body, so it needs no header action or global
 * main-panel registration.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { ExternalTaskView } from './page.tsx'
import { en, NS, zh } from './locales.ts'

/** Services this plugin injects from the client root. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register copy and the external-task conversation view.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'external-task-context: dictionaries')

  const t = ctx.locale.bind(NS)

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'external-task',
    order: 15,
    label: () => t('view.label'),
    locale: NS,
  }, ExternalTaskView))
}
