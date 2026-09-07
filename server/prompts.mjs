import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'
import { resultImage } from './store.mjs'

const promptsFile = join(getDataDir(), 'prompts.json')
const ID = /^[a-z0-9][a-z0-9._-]{1,119}$/
const MODES = new Set(['image', 'text'])
const RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16']
let writeChain = Promise.resolve()


function validCoverReference(cover) {
  if (cover == null) return true
  if (typeof cover !== 'string' || cover.length === 0 || cover.length > 2000) return false
  if (cover.startsWith('/skill-assets/')) return true
  try {
    const parsed = new URL(cover, 'http://127.0.0.1')
    return ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.pathname.startsWith('/api/jobs/')
  } catch {
    return false
  }
}

function validPrompt(prompt) {
  return Boolean(
    prompt && typeof prompt === 'object' && ID.test(prompt.id) &&
    typeof prompt.name === 'string' && prompt.name.trim() && prompt.name.length <= 200 &&
    typeof prompt.summary === 'string' && prompt.summary.length <= 500 &&
    typeof prompt.template === 'string' && prompt.template.trim() && prompt.template.length <= 30000 &&
    MODES.has(prompt.mode) && validCoverReference(prompt.cover) &&
    (prompt.coverFit === undefined || ['contain', 'cover'].includes(prompt.coverFit)) &&
    (!prompt.coverPosition || (Number.isFinite(prompt.coverPosition.x) && Number.isFinite(prompt.coverPosition.y) && prompt.coverPosition.x >= 0 && prompt.coverPosition.x <= 100 && prompt.coverPosition.y >= 0 && prompt.coverPosition.y <= 100)) &&
    typeof prompt.createdAt === 'string' && typeof prompt.updatedAt === 'string'
  )
}

function inputSchema(prompt) {
  return prompt.mode === 'image'
    ? [
        { id: 'source_images', type: 'image', label: '原图', required: true, multiple: false, hint: '上传一张需要重新创作的图片' },
        { id: 'direction', type: 'textarea', label: '本次补充要求（可选）' },
        { id: 'ratio', type: 'ratio', label: '输出比例', options: RATIOS },
      ]
    : [
        { id: 'direction', type: 'textarea', label: '本次生成内容', required: true, placeholder: '输入这次要生成的主体或内容' },
        { id: 'ratio', type: 'ratio', label: '输出比例', options: RATIOS },
      ]
}

function decorate(prompt) {
  return {
    ...prompt,
    cover: resultImage(prompt.cover),
    kind: 'prompt',
    english: 'PROMPT TEMPLATE',
    modeLabel: prompt.mode === 'image' ? '图片转化' : '纯文本生成',
    inputSchema: inputSchema(prompt),
    coverStatus: prompt.cover ? 'generated' : 'needs_sample',
  }
}

async function readPromptsUnsafe() {
  try {
    const stored = JSON.parse(await readFile(promptsFile, 'utf8'))
    if (!Array.isArray(stored) || !stored.every(validPrompt)) throw new Error('invalid_prompts_store')
    return stored
  } catch (error) {
    if (error.code === 'ENOENT') return []
    if (error.message === 'invalid_prompts_store') throw error
    throw new Error('invalid_prompts_store')
  }
}

async function writePromptsUnsafe(prompts) {
  await mkdir(getDataDir(), { recursive: true })
  const tempFile = `${promptsFile}.${process.pid}.${Date.now()}.tmp`
  const stored = prompts.map((prompt) => ({ ...prompt, cover: resultImage(prompt.cover, '') }))
  await writeFile(tempFile, `${JSON.stringify(stored, null, 2)}\n`, 'utf8')
  await rename(tempFile, promptsFile)
  return prompts
}

function enqueue(operation) {
  const next = writeChain.then(operation)
  writeChain = next.catch(() => {})
  return next
}

export async function listPrompts() {
  await writeChain
  return (await readPromptsUnsafe()).map(decorate)
}

export async function getPrompt(id) {
  await writeChain
  const prompt = (await readPromptsUnsafe()).find((item) => item.id === id)
  return prompt ? decorate(prompt) : null
}

export function createPrompt(input) {
  return enqueue(async () => {
    const now = new Date().toISOString()
    const prompt = {
      id: typeof input?.id === 'string' ? input.id : `prompt-${Date.now().toString(36)}`,
      name: typeof input?.name === 'string' ? input.name.trim() : '',
      summary: typeof input?.summary === 'string' ? input.summary.trim() : '',
      template: typeof input?.template === 'string' ? input.template.trim() : '',
      mode: input?.mode,
      cover: null,
      coverPosition: { x: 50, y: 50 },
      createdAt: now,
      updatedAt: now,
    }
    if (!validPrompt(prompt)) throw new Error('invalid_prompt')
    const current = await readPromptsUnsafe()
    if (current.some((item) => item.id === prompt.id)) throw new Error('prompt_already_exists')
    await writePromptsUnsafe([...current, prompt])
    return decorate(prompt)
  })
}

export function updatePrompt(id, patch = {}) {
  return enqueue(async () => {
    const current = await readPromptsUnsafe()
    const index = current.findIndex((item) => item.id === id)
    if (index < 0) return null
    const next = {
      ...current[index],
      ...(typeof patch.name === 'string' ? { name: patch.name.trim() } : {}),
      ...(typeof patch.summary === 'string' ? { summary: patch.summary.trim() } : {}),
      ...(typeof patch.template === 'string' ? { template: patch.template.trim() } : {}),
      ...(MODES.has(patch.mode) ? { mode: patch.mode } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'cover') ? { cover: patch.cover } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'coverPosition') ? { coverPosition: patch.coverPosition } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'coverFit') ? { coverFit: patch.coverFit } : {}),
      updatedAt: new Date().toISOString(),
      id,
    }
    if (!validPrompt(next)) throw new Error('invalid_prompt')
    current[index] = next
    await writePromptsUnsafe(current)
    return decorate(next)
  })
}

export function deletePrompt(id) {
  return enqueue(async () => {
    const current = await readPromptsUnsafe()
    const prompt = current.find((item) => item.id === id)
    if (!prompt) return null
    await writePromptsUnsafe(current.filter((item) => item.id !== id))
    return decorate(prompt)
  })
}
