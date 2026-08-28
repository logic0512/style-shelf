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
    id: 'editorial-paper-cut-poster',
    name: '高端纸艺编辑海报',
    summary: '照片保真与极简手工层叠剪纸纸雕拼贴。',
    template: `请为我上传的每张照片制作一张独立的高端设计海报，不要多图拼贴；每张照片单独输出。使用整体3：4的垂直构图，上下部分高度严格为1：1，每个部分占据画面的50%。

上半部分保留原始照片，保留主结构、逼真的质感、自然光线与阴影以及原有的色彩氛围，仅采用细微的高端摄影色彩调色，营造艺术杂志、独立出版物和展览摄影的感觉。为了符合画面，可以自然延伸天空、地面或环境背景，但不要拉伸、扭曲或改变主体。

下半部分从照片中提取最具辨识性的主题、轮廓、姿势和叙事关系，将它们重构成极简手工层叠剪纸和纸雕拼贴。以一个核心主题作为视觉锚点，通过折叠、切割、叠加和遮罩重新诠释关键轮廓、比例和结构，而不机械复制细节；从原始图像中挑选环境关系，将其转化为前景、中景和背景纸层，通过比例差异、轴线、正负形状、前后遮罩以及大面积负空间建立清晰层级，使主体即时可辨识，同时体现现代编辑构图的克制与秩序。

色彩调色板从上方照片中最具辨识度、鲜艳的色彩中提取，转化为有限且和谐的纸张组合，以温暖象牙色或浅色纸张为底，通过原色、深色结构色调、浅层叠加和极简点缀色构建空间。使用细腻哑光卡纸、可见纸纤维、干净边缘和柔和接触阴影，配合自然漫射光线，突出折叠层的厚度和真实手工触感，避免塑料3D效果、廉价卡纸、霓虹色和复杂渐变。

文本建立完整的高端编辑微排版系统。从照片的主体身份、地点、动作、素材、氛围或象征意义中提炼简短主标题，搭配2到4组非常小的辅助文本，灵活组合对象名称、地点信息、数字、章节标记、序列号、坐标式数字、方向词、地位词、物质术语、类别标签或一条极短诗意注释，不使用年份。主标题负责认同和情感，小文字负责秩序、节奏和精致。文本必须与剪纸图形整合，可沿纸层边缘、主体轮廓、几何轴或负空间对齐，或采用水平／垂直布局、旋转、宽字距、边缘对齐、角压、跨色块、纸层嵌入，或通过遮罩和交织与主体互动，确保纸艺处理视觉统一、主体清晰、排版克制。`,
    mode: 'image', cover: null, coverPosition: { x: 50, y: 50 }, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'handdrawn-paper-cover',
    name: '纸质手绘封面海报',
    summary: '纸质手绘封面插图与照片上下分栏。',
    template: `请为我上传的每张照片制作一张独立的高端设计海报，不要多图拼贴，每张照片单独输出。整体采用3：4的垂直构图，上下区域高度严格为1：1，每个区域占据画面的50%。

上半部分保留原始照片，保留主结构、逼真的质感、自然光影以及原有色彩氛围，仅通过细微的高端摄影调色，营造杂志摄影和艺术出版材料的感觉。为了符合画面，可以自然延伸天空、地面或环境背景，但不要拉伸、扭曲或改变主体。

下半部分从照片中提取最具辨识性的主要主题、轮廓、姿势和叙事关系，将它们重构成极简的纸质手绘封面插图。高度精炼和简化复杂细节，仅保留最关键的视觉特征，通过细腻、略显不稳定的手绘线条和少数明显的丙烯平面色块重新表现，使原始主题能立即识别。保持主体小巧且居中，占据下半部分约10%至20%，周围留有大片空白，背景主要使用粗糙的白纸或浅色纸张，仅用极少的线条或色块暗示环境。

色彩调色板从上方照片提取，压缩为不超过4种主色，色块粗犷、完整且克制，保留纸纹、手工绘制的笔触和略微不规则的边缘。线条负责结构线索，色块建立主要主题。避免彩色铅笔、蜡笔、水彩渗色、纯线条艺术、复杂写实、浓重油画、流畅数字插画和3D纹理。

可包含少量简洁文本，灵活使用标题、关键词、物品名称、地点、年份、数字或短语，基于照片内容，不限于城市主题。文字布局简洁克制，自然地与空白和插画融合，唤起艺术书封面、独立出版物和儿童绘本设计的氛围。整体呈现小题材、大空白、精致度强、高识别度、安静、童真、轻松、诗意且精致的视觉特质，避免商业卡通、电商氛围和模板感。`,
    mode: 'image', cover: null, coverPosition: { x: 50, y: 50 }, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'impasto-mini-landscape',
    name: '厚涂油画微型景观',
    summary: '照片主题重构为厚涂油画微型景观海报。',
    template: `每张上传的照片，单独创建一个高端设计海报，不要多图拼贴——每张照片单独输出。使用整体3：4的垂直构图，上下部分高度严格为1：1，每个部分占据画面的50%。

上半部分保留原始照片，保留主角的身份、结构、比例、逼真质感、自然光影以及原有色彩氛围。只需采用细腻的高端彩色分级，赋予艺术杂志、独立出版物和展览摄影的质量。为了符合画面，可以自然延伸天空、地面或环境背景，但不要拉伸、扭曲或改变主体。

下半部分从照片中提取最易识别的主题、轮廓、姿态和叙事关系，将它们重构成3D厚涂油画风格的微型风景插画海报。不要机械复制照片；将主题转化为精致、三维、具体的微型景观，通过厚重笔触、色彩层叠和雕塑般体积重新塑造。保留主体核心身份和关键特征，同时适度优化角度、比例和细节以适应微观景观呈现。

构图使用大面积负空间与一个居中或略偏中心的对角轴。在明亮的白色纹理纸面上，用与原照片主题相关的半透明厚涂层色带支撑主体，这些色带可以转化为水面、地面、路径、光带或抽象景观切片；主体自然与色带互动，并根据内容添加反射、波纹、光斑或延展笔触。背景仅保留与主题相关的浓密云层、阳光、薄雾或自然意象，营造轻盈且富有诗意的空间层叠感。

绘画语言强调厚涂油画、微型实体和半透明光感。保留明显颜料堆积、调色刀痕、起伏边缘、纸张质感和半手工造型感；在水面、云朵、色带和局部高光上涂上厚厚的涂层，使主体既细腻立体又具备真实油画颜料质感。色彩从上方照片中提取最明亮、最鲜艳、最具生命力的颜色并重新混合，整体阳光、清新、温暖、轻松且充满活力，避免灰暗脏色、褪色、Morandi化、深棕滤镜、荧光色和廉价糖果感。`,
    mode: 'image', cover: null, coverPosition: { x: 50, y: 50 }, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'storybook-woodcut-poster',
    name: '童话木刻风格海报',
    summary: '童话木刻手绘叙事海报，适配多种主题。',
    template: `为上传的每张照片制作一张独立的设计海报，不要把多张图片拼接在一起——每张照片都单独输出。使用整体3：4的竖直构图，上下部分高度严格为1：1，各自占据画面的50%，并确保这种表达能够适应人物、动物、建筑、静物、自然景致等多种主题。

上半部分保留原始照片，保留主角的身份、动作、空间关系、逼真质感、自然光影以及原有色彩氛围，仅通过细微的高端摄影色彩调色，营造杂志摄影和艺术出版物的感觉。为了符合画面，可以自然延伸天空、地面或环境背景，但不要拉伸、扭曲或改变主体。

下半部分提取照片中最具辨识度的主体、轮廓、姿势和叙事关系，将它们重构为童话般的木刻风格手绘图像。不要机械复制细节；将主体浓缩成一两个清晰的大块，采用钝轮廓、略微夸张比例和极简边缘，以保留原物身份、动作、功能和情感。从原始图像内容中提取素材，创建大面积低亮度或高对比度结构场，作为包裹主体的容器、路径、框架或密度层；背景如同故事背景的外壳，从原始空间和语义元素中成长，形成遮挡、裁剪、吞噬和部分揭示的结构，以丰富叙事层次。

从上方照片提取色彩调色板，保持清晰的三层关系：大面积深色结构色强调重量和边界，中等浅色或负空间作为呼吸空间，小区域高饱和情感色彩用于阅读路径和故事线索。线条仅出现在功能点、路径点、边界点、纹理点和识别点，保持稀疏、手绘、略显不精确。所有色块保持平整，同时保留干刷、颗粒、飞溅、纸质纹理、点描和细微错位，融合丝网印刷与蜡笔的手工质感，避免逼真光影、复杂体积、平滑矢量边缘、3D渲染和塑料纹理。`,
    mode: 'image', cover: null, coverPosition: { x: 50, y: 50 }, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'minimal-magazine-collage',
    name: '极简杂志剪贴拼贴',
    summary: '温暖手工编辑剪贴拼贴风插画。',
    template: `将上传的图片转换为极简杂志剪贴拼贴风插画。保留上传图片中的主体、姿势和整体概念，但将其重新诠释为温暖的手工编辑拼贴风格。

风格：极简杂志剪贴拼贴插画，扁平化分层纸片形状，柔和的粉彩纸张纹理，撕纸边缘，纸张投影效果，干净的黑色涂鸦点缀，手工剪贴本氛围，现代韩系编辑设计感，简单可爱的构图，大面积干净的白色留白。

角色：可爱的简化韩系人物，极简五官，轻松的小微笑，柔和圆润的比例，简单休闲的服装，纸雕分层剪影感。构图：竖版3:4比例，主体略微靠下并偏离中心摆放，另一侧保留大面积空白，稀疏、轻盈、有呼吸感的布局，不要拥挤。

物件：只添加少量相关的拼贴道具，如纸质便签、小爱心、植物、咖啡杯、窗户、胶带片和简单涂鸦图标。文字排版：添加一个优雅的手写英文标题，与画面场景相匹配，可使用“Take a small break”“Soft little moment”“Everyday joy”“Quiet mood”“Good day, good mood”等短语。

氛围：平静、舒适、温暖、可爱、编辑感。避免真实照片质感、动漫风格、水彩、3D黏土风、过于复杂的背景、拥挤拼贴、奢华海报感、深色调、强烈硬阴影和杂乱文字。`,
    mode: 'image', cover: null, coverPosition: { x: 50, y: 50 }, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
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
