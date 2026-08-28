export function buildPromptExecution(job, prompt) {
  const turn = (job.turns || []).find((item) => item.id === job.activeTurnId) || job.turns?.at(-1) || null
  const filenames = new Set(turn?.inputFilenames || [])
  const inputs = filenames.size
    ? (job.inputs || []).filter((input) => filenames.has(input.filename))
    : (job.inputs || [])
  const previous = turn?.parentArtifactFilename
    ? (job.artifacts || []).find((artifact) => artifact.filename === turn.parentArtifactFilename)
    : null
  const fields = job.payload?.fields && typeof job.payload.fields === 'object' ? job.payload.fields : {}
  const currentText = String(fields.continuationPrompt || job.payload?.text || fields.direction || '').trim()
  if (prompt.mode === 'image' && inputs.length === 0) throw new Error('prompt_image_required')
  if (prompt.mode === 'text' && !currentText) throw new Error('prompt_text_required')
  const inputPaths = inputs.map((input) => `- ${input.path}`).join('\n') || '- 无'

  return [
    `执行 Style Shelf Prompt Job ${job.id}。`,
    `固定风格 Prompt：${prompt.template}`,
    `本次内容或补充要求：${currentText || '无'}`,
    `输出比例：${fields.ratio || job.payload?.ratio || '3:4'}`,
    '用户图片：',
    inputPaths,
    `上一轮结果：${previous?.path || '无'}`,
    `输出目录：${job.outputDir}`,
    '使用内置图片生成能力直接完成图片；只能使用上面列出的用户图片和输出目录，不执行与生图无关的命令或文件操作。不要只返回计划。',
  ].join('\n')
}
