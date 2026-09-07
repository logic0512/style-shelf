export function isInputFieldReady(field, { values = {}, filesByField = {}, answers = {} } = {}) {
  if (field.type === 'image') return (filesByField[field.id] || []).length > 0
  if (field.type === 'textarea') return String(values[field.id] || '').trim().length > 0
  if (field.type === 'select') return (field.options || []).some((option) => option.value === values[field.id])
  if (field.type === 'ratio') return (field.options || []).includes(values[field.id])
  if (field.type === 'questions') return Array.isArray(field.questions) && field.questions.length > 0 && field.questions.every((question) => question.options?.includes(answers[question.id]))
  return false
}

export function hasPromptChanges(prompt, values) {
  return ['name', 'summary', 'mode', 'template'].some((key) => String(values[key] || '') !== String(prompt[key] || ''))
}

const ERROR_MESSAGES = {
  skill_installer_unavailable: '远程 Skill 安装器不可用；请先运行诊断并补齐 Codex 系统安装器。',
  invalid_skill_manifest: '这个 SKILL.md 的输入配置格式不受支持，请检查字段类型和选项格式。',
  installed_skill_manifest_missing: '没有找到可读取的 SKILL.md，请检查仓库路径。',
  skill_not_found: '原始 Skill 文件已不存在，请重新安装或导入。',
  job_already_exists: '任务编号已存在，请重新创建任务。',
}

export function userFacingError(message, fallback = '') {
  if (message?.startsWith('job_input_required:')) return '请完成所有必填输入后再运行。'
  return ERROR_MESSAGES[message] || message || fallback
}
