import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'

const promptsFile = join(getDataDir(), 'prompts.json')
const ID = /^[a-z0-9][a-z0-9._-]{1,119}$/
const MODES = new Set(['image', 'text'])
const RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16']
let writeChain = Promise.resolve()

const DEFAULT_PROMPTS = [
  {
    id: 'ink-stamp-travel',
    name: '油墨印章图章',
    summary: '把照片转成三色旅行纪念印章风格插画。',
    template: '请将上传照片转化为三色旅行纪念印章风格插画。保留照片中最具辨识度的主体轮廓和空间特征，将复杂场景提炼成一枚小型手工印章图案，而不是完整插画。画面像盖在米白色宣纸上的收藏印记，主体缩小居中，四周留出大量干净空白。\n\n使用三色印章效果：以深黑、灰蓝或墨绿色作为主要印泥颜色，概括主体轮廓；搭配一到两种辅助颜色表现建筑、植物、水面或关键特征。避免大面积铺满画面，不要像海报或版画。图案应具有印章边缘的不规则感、轻微缺墨、断裂线条、颗粒印泥纹理和手工盖印痕迹。\n\n将照片中的细节高度简化，只保留最重要的形态识别点：建筑保留轮廓和结构比例，人物保留姿态剪影，风景保留山、水、树等主要关系。减少线条数量，避免复杂刻画，让图案像一枚旅行纪念章或艺术家手刻印章。\n\n整体风格：复古旅行收藏章、东方篆刻美学、手工橡皮章、极简纪念印记。背景为温暖米白纸张纹理，大量留白，安静克制，高级简洁。',
    mode: 'image',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'retro-geometric-print',
    name: '复古几何版画',
    summary: '把照片转成极简、低饱和的复古版画海报。',
    template: '请将上传的照片转化为“极简版画海报”风格。严格提炼照片中最核心的主体与构图关系，只保留最有辨识度的轮廓、体块和空间秩序，删去大部分真实细节、纹理、反光和次要元素。人物、建筑、植物、器物或场景都概括成少量清晰的大色块与简洁线面，不做写实描绘，也不要丰富拼贴，不要贴纸感，不要复杂装饰。整体应像非常精简的复古版画：平面、克制、安静、图形化，具有明显的印刷颗粒、旧纸纹理和轻微磨损感。配色控制在2–4种，可从原图提取主色，再搭配米白底色；颜色低饱和、偏复古，如雾蓝、灰绿、浅粉、砖红、芥黄、深墨绿等。\n\n排版采用竖向海报构图：上半部分为原照片，下半部分为极简版画插画。插画区域以米白色纸张为底，主体居中偏大，形成明确视觉中心，可搭配一个极简几何背景形，如圆、半圆、拱形或矩形色块，用来托住主体，但不要太多。四周留白充足，文字极少，只允许少量小字、年份、地点或短句，作为版式点缀。整体气质应接近现代主义海报与老版旅行印刷品的结合，简练、有秩序、有呼吸感。避免写实插画、复杂笔触、元素堆砌和过多说明性图形。',
    mode: 'image',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
]

function validCoverReference(cover) {
  if (cover == null) return true
  if (typeof cover !== 'string' || cover.length === 0 || cover.length > 2000) return false
  if (cover.startsWith('/skill-assets/')) return true
  try {
    const parsed = new URL(cover)
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
    if (error.code === 'ENOENT') return DEFAULT_PROMPTS
    if (error.message === 'invalid_prompts_store') throw error
    throw new Error('invalid_prompts_store')
  }
}

async function writePromptsUnsafe(prompts) {
  await mkdir(getDataDir(), { recursive: true })
  const tempFile = `${promptsFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempFile, `${JSON.stringify(prompts, null, 2)}\n`, 'utf8')
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
