/**
 * Client entry: dictionary, sidebar page type, tab body, and header action.
 *
 * The page type is opened by kind only (no resource address). The tab body is
 * registered in the session-scoped keyed seat under the same id, and the
 * header action opens the page in a new pane when layout room allows.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { ExternalTaskContextAction } from './action.tsx'
import { ExternalTaskContextPanel } from './panel.tsx'
import { en, NS, zh } from './locales.ts'

/** Sidebar tab type id; also the key of the tab body registration. */
const PLUGIN_ID = 'dsh-external-task-context'
/** Page kind opened through `ctx.sidebarRight.openTab`. */
const TAB_KIND = 'external-task-context'

/** Services this plugin injects from the client root. */
export const inject = ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs']

/**
 * Client plugin body: register copy, the tab type, its body, and the header
 * action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'external-task-context: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: PLUGIN_ID,
    kind: TAB_KIND,
    title: () => t('panel.title'),
  }), 'external-task-context: tab type')

  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: PLUGIN_ID,
    locale: NS,
  }, ExternalTaskContextPanel))

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'external-task-context',
    order: 15,
    locale: NS,
    inject: () => ({
      openPanel: () => {
        ctx.sidebarRight.openTab(TAB_KIND, { preferNewPane: true })
      },
    }),
  }, ExternalTaskContextAction))
}
