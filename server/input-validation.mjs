function fieldReady(field, job) {
  const fields = job.payload?.fields || {}
  const answers = job.payload?.answers || {}
  if (field.type === 'image') return (job.inputs || []).some((input) => input.fieldId === field.id)
  if (field.type === 'textarea') return String(fields[field.id] || '').trim().length > 0
  if (field.type === 'select') return (field.options || []).some((option) => option.value === fields[field.id])
  if (field.type === 'ratio') return (field.options || []).includes(fields[field.id])
  if (field.type === 'questions') return Array.isArray(field.questions) && field.questions.length > 0 && field.questions.every((question) => question.options?.includes(answers[question.id]))
  return false
}

export function assertJobInput(job, source) {
  const schema = source?.inputSchema || []
  for (const field of schema.filter((item) => item.required)) {
    if (!fieldReady(field, job)) throw new Error(`job_input_required:${field.id}`)
  }
  if (source?.requiredAny?.length && !source.requiredAny.some((id) => fieldReady(schema.find((field) => field.id === id) || { id, type: 'textarea' }, job))) {
    throw new Error('job_input_required:any')
  }
}
