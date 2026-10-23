/**
 * Typed dictionary for the external-task context namespace.
 *
 * `zh` is the key-set source of truth; `en` is checked against it so a
 * missing or extra key fails to compile.
 */
export const NS = 'externalTaskContext'

export const zh = {
  'action.label': '外部任务 {count}',
  'action.tooltip': '查看外部任务上下文',
  'panel.title': '外部任务上下文',
  'panel.subtitle': '委派提示词、运行上下文与返回结果',
  'panel.empty': '当前会话还没有外部任务记录。',
  'panel.unavailable': '投影不可用',
  'panel.unavailableHint': '请确认外部任务上下文插件已在当前配置中启用，然后重新打开会话。',
  'panel.selectHint': '请选择一个任务查看详情。',
  'panel.listAria': '外部任务列表',
  'detail.status': '状态',
  'detail.createdAt': '开始时间',
  'detail.completedAt': '完成时间',
  'detail.tool': '工具',
  'detail.prompt': '委派提示词',
  'detail.promptMissing': '未记录委派提示词。',
  'detail.context': '运行上下文',
  'detail.cwd': '工作目录',
  'detail.provider': '提供方',
  'detail.model': '模型',
  'detail.reasoning': '推理强度',
  'detail.preset': 'Agent 预设',
  'detail.answer': '返回内容',
  'detail.answerPending': '尚未记录返回结果（任务可能仍在运行）。',
  'detail.answerEmpty': '任务已结束，但没有返回文本结果。',
  'detail.summary': '结束摘要',
  'detail.truncated': '内容过长，已截断显示。',
  'status.pending': '进行中',
  'status.completed': '已完成',
  'status.aborted': '已中止',
  'status.maxTokens': '输出达到上限',
  'status.refusal': '已拒绝任务',
  'status.error': '失败',
  'status.unknown': '未知',
} as const

export type ExternalTaskKey = keyof typeof zh

export const en: Record<ExternalTaskKey, string> = {
  'action.label': 'External tasks {count}',
  'action.tooltip': 'Inspect external task context',
  'panel.title': 'External task context',
  'panel.subtitle': 'Delegation prompt, runtime context, and returned outcome',
  'panel.empty': 'This session has no external task records yet.',
  'panel.unavailable': 'Projection unavailable',
  'panel.unavailableHint': 'Confirm the external task context plugin is enabled in this profile, then reopen the session.',
  'panel.selectHint': 'Select a task to see its details.',
  'panel.listAria': 'External task list',
  'detail.status': 'Status',
  'detail.createdAt': 'Started',
  'detail.completedAt': 'Completed',
  'detail.tool': 'Tool',
  'detail.prompt': 'Delegation prompt',
  'detail.promptMissing': 'No delegation prompt was recorded.',
  'detail.context': 'Runtime context',
  'detail.cwd': 'Working directory',
  'detail.provider': 'Provider',
  'detail.model': 'Model',
  'detail.reasoning': 'Reasoning effort',
  'detail.preset': 'Agent preset',
  'detail.answer': 'Returned content',
  'detail.answerPending': 'No result recorded yet (the task may still be running).',
  'detail.answerEmpty': 'The task ended without a text result.',
  'detail.summary': 'Settlement summary',
  'detail.truncated': 'The content was too long and is truncated.',
  'status.pending': 'Running',
  'status.completed': 'Completed',
  'status.aborted': 'Stopped',
  'status.maxTokens': 'Token limit reached',
  'status.refusal': 'Task declined',
  'status.error': 'Failed',
  'status.unknown': 'Unknown',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    externalTaskContext: ExternalTaskKey
  }
}
