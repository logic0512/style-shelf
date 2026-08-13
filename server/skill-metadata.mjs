const CURATED_SKILL_METADATA = {
  'photo-abstract-editorial': {
    summaryZh: '照片保真抽象双联画，适合风景、建筑和人物。',
    descriptionZh: '将用户提供的照片保留为主体，并从照片的空间、色调和构图关系中重建克制的抽象记忆面板，形成竖版社论式双联画。适合风景、建筑、人物和具有明确空间关系的摄影素材；不是滤镜或完全重绘。',
    styleSummaryZh: '照片保真 + 来源抽象面板 + 象牙色留白的社论式双联画。',
    subjectSummaryZh: '适合风景、建筑、人物和空间关系清楚的摄影素材。',
  },
  'gc-minimal-zine-poster-v0-1': {
    summaryZh: '旧纸质感极简 Zine 海报，适合观点和短句。',
    descriptionZh: '把主题、句子、物件、情绪、文章想法、照片或内容简报压缩成安静的日式／韩式 Zine 纸张海报，结合大面积留白、旧纸质感、实验性排版和克制的高饱和色点。适合观点、短句、活动主题、物件和照片概念。',
    styleSummaryZh: '大面积留白、旧纸质感、实验排版和单一高饱和视觉锚点的极简纸刊海报。',
    subjectSummaryZh: '适合观点、短句、活动主题、物件、情绪和照片概念。',
  },
  'scene-distillation-zine-v1-3': {
    summaryZh: '高饱和插画 Zine 海报，适合人物与叙事情绪。',
    descriptionZh: '将用户提供的照片作为语义和情绪依据，不把原照片保留在最终画面中，而是重构为具有平面插画、高饱和色彩、留白和作者性文字的极简 Zine 海报。适合人物、场景和具有叙事或情绪张力的照片再创作；不是滤镜、描摹或保留原图的转绘。',
    styleSummaryZh: '来源语义蒸馏成平面插画、高饱和色块、留白和作者性文字。',
    subjectSummaryZh: '适合人物、场景和有叙事／情绪张力的照片。',
  },
  'scenes-gathered-zine-v1-3': {
    summaryZh: '撕纸边界抽象拼贴，适合风景、植物和旅行。',
    descriptionZh: '将用户提供的照片作为真实场景锚点，置于宽松的来源抽象插画场中，压缩植物和其他细节，用少量大形体、一个高纯度色彩结构和清晰的撕纸边界重组画面。适合自然风景、植物、街景、旅行和需要保留真实场景关系的照片，也可结合用户对主体、空间和情绪的想法生成。',
    styleSummaryZh: '真实照片锚点 + 来源抽象插画场 + 高纯度色彩结构 + 撕纸边界。',
    subjectSummaryZh: '适合自然风景、植物、街景、旅行和有明确场景关系的照片。',
  },
  'ian-xiaohei-illustrations': {
    summaryZh: '纯白手绘解释图，适合流程、结构和观点。',
    descriptionZh: '把中文文章、帖子、博客、Notion 或工作流文档中的方法论、流程、状态和观点，转成 Ian 小黑风格的 16:9 正文配图：纯白手绘、黑色小黑角色、少量红橙蓝批注，简洁但带有荒诞感的视觉隐喻。适合解释认知锚点、流程、结构、状态和观点，不是商业插画、PPT 信息图或可爱卡通。',
    styleSummaryZh: '纯白手绘底、黑色小黑角色和少量红橙蓝批注组成的怪诞解释图。',
    subjectSummaryZh: '适合中文文章、流程、结构、状态、隐喻和观点。',
  },
  'daily-photo-playground': {
    summaryZh: '高饱和情绪海报，适合旅行与人物照片。',
    descriptionZh: '将日常摄影照片拆解成适合小红书和抖音的 3:4 高饱和情绪海报：暖白外部页面、高饱和版心、放大主体、纯色几何、完整原照片窗口和衬线排版。适合旅行、生活方式、人物动作和具有明确情绪的日常照片；不是滤镜或随机拼贴。',
    styleSummaryZh: '暖白页面、高饱和版心、放大主体、几何形体和衬线排版的情绪海报。',
    subjectSummaryZh: '适合旅行、生活方式、人物动作和有明确情绪的日常照片。',
  },
  'vinyl-image-generator': {
    summaryZh: '4:3 黑胶发行物，适合记忆、地点与故事。',
    descriptionZh: '把记忆、句子、情绪、故事、物件、地点或参考图，转成一张 4:3 横向、独立唱片厂牌风格的虚构黑胶发行物：正面封套、背面封套、Side A 和 Side B 四个相连部分，强调排版、印刷历史和实体材质。适合把个人记忆、地点和概念转成音乐视觉档案；不是专辑海报、广告或奢侈品产品渲染。',
    styleSummaryZh: '4:3 横向黑胶发行物，包含封套、唱片和实体印刷材质。',
    subjectSummaryZh: '适合记忆、地点、故事、物件、情绪和概念。',
  },
}

function parseJsonBlock(content) {
  const block = content.match(/<!--\s*styleshelf-metadata\s*([\s\S]*?)\s*-->/i)?.[1]?.trim()
  if (!block) return null
  try {
    const value = JSON.parse(block)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export function parseSkillFrontmatter(content) {
  const name = content.match(/^name:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim() || ''
  const descriptionMatch = content.match(/^description:\s*(.*)$/m)
  let description = descriptionMatch?.[1]?.trim() || ''
  if (/^(?:>-?|\|-?)$/.test(description) && descriptionMatch) {
    const start = descriptionMatch.index + descriptionMatch[0].length
    const lines = []
    for (const line of content.slice(start).split(/\r?\n/)) {
      if (!line.trim()) continue
      if (!/^\s+/.test(line) || /^\s*---\s*$/.test(line)) break
      lines.push(line.trim())
    }
    description = lines.join(' ').trim()
  }
  description = description.replace(/^['"]|['"]$/g, '').trim()
  return { name, description }
}

function chineseDescriptionFromSource(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => {
    const chinese = (line.match(/[\u3400-\u9fff]/g) || []).length
    const visible = line.replace(/\s/g, '').length
    const ratio = chinese / Math.max(visible, 1)
    return line.length >= 24 && chinese >= 12 && ratio >= 0.55 && /^[\u3400-\u9fff]/.test(line)
  })
  return lines.find((line) => !line.startsWith('#') && !line.startsWith('-')) || ''
}

const STYLE_HINTS = [
  [/doodle|childlike|micro worker|简笔画|涂鸦/i, '物件涂鸦海报'],
  [/zine|纸刊/i, 'Zine 纸张海报'],
  [/poster|海报/i, '主题海报视觉'],
  [/abstract|抽象/i, '抽象重构视觉'],
  [/illustration|illustrated|插画|手绘|doodle/i, '手绘插画视觉'],
  [/watercolor|水彩/i, '水彩绘画质感'],
  [/collage|拼贴|torn|撕纸/i, '纸张拼贴视觉'],
  [/editorial|社论|magazine/i, '社论排版视觉'],
  [/vinyl|record|黑胶|唱片/i, '黑胶唱片视觉'],
  [/diagram|流程|结构|解释图/i, '信息解释图'],
  [/3d|render|渲染/i, '三维渲染视觉'],
  [/anime|manga|二次元/i, '动漫插画视觉'],
  [/photo|photograph|摄影|photo-real/i, '摄影转绘视觉'],
]

const SUBJECT_HINTS = [
  [/landscape|nature|风景|自然/i, '风景'],
  [/architecture|建筑/i, '建筑'],
  [/portrait|人物|人像/i, '人物'],
  [/photo|photograph|life photo|摄影|照片/i, '生活照片'],
  [/travel|旅行/i, '旅行'],
  [/article|blog|notion|文章|流程|观点/i, '文章与观点'],
  [/object|product|物件|产品/i, '物件'],
  [/scene|场景/i, '场景'],
  [/music|record|唱片/i, '音乐概念'],
]

function generatedMetadata({ skillId, sourceName, sourceDescription, content, mode = 'mixed' }) {
  const descriptor = `${skillId} ${sourceName} ${sourceDescription}`
  const haystack = `${descriptor} ${content}`
  const styles = STYLE_HINTS.filter(([pattern]) => pattern.test(haystack)).map(([, label]) => label).slice(0, 2)
  const subjects = SUBJECT_HINTS.filter(([pattern]) => pattern.test(descriptor)).map(([, label]) => label).slice(0, 4)
  const style = styles.join(' + ') || '按 Skill 原始规则构成的定制视觉'
  const subject = subjects.join('、') || (mode === 'text' ? '文字、观点和主题表达' : '照片、场景和主题想法')
  const input = mode === 'text' ? '文字输入' : mode === 'image' ? '图片输入' : '图片与文字输入'
  const ratio = haystack.match(/\b(?:1:1|4:3|3:4|16:9|9:16|3:5|5:3|21:9)\b/)?.[0]
  const ratioText = ratio ? `，常用 ${ratio} 画幅` : ''
  return {
    summaryZh: `${style}，适合${subject}${ratioText}。`,
    descriptionZh: `${style}，适合${subject}${ratioText}。支持${input}，具体构图、文字和细节遵循该 Skill 的原始规则。`,
    styleSummaryZh: `${style}${ratioText}。`,
    subjectSummaryZh: `适合${subject}。`,
  }
}

export function resolveSkillMetadata(skillId, content = '', options = {}) {
  const frontmatter = parseSkillFrontmatter(content)
  const explicit = parseJsonBlock(content)
  const metadataKey = skillId === 'minimal-zine-poster-v01' ? 'gc-minimal-zine-poster-v0-1' : skillId
  const curated = CURATED_SKILL_METADATA[metadataKey]
  const sourceName = frontmatter.name || skillId
  const sourceDescription = frontmatter.description || ''
  const generated = generatedMetadata({ skillId, sourceName, sourceDescription, content, mode: options.mode })
  const sourceChineseDescription = chineseDescriptionFromSource(content)
  const descriptionZh = explicit?.descriptionZh || curated?.descriptionZh || sourceChineseDescription || generated.descriptionZh
  const styleSummaryZh = explicit?.styleSummaryZh || curated?.styleSummaryZh || generated.styleSummaryZh
  const subjectSummaryZh = explicit?.subjectSummaryZh || curated?.subjectSummaryZh || generated.subjectSummaryZh
  const summaryZh = explicit?.summaryZh || curated?.summaryZh || generated.summaryZh
  return {
    name: sourceName,
    sourceName,
    sourceDescription,
    summaryZh,
    descriptionZh,
    styleSummaryZh,
    subjectSummaryZh,
    desc: descriptionZh,
    metadataSource: explicit ? 'explicit' : curated ? 'curated' : sourceChineseDescription ? 'source' : 'generated',
    needsMetadataReview: false,
  }
}

export function curatedSkillMetadata(skillId) {
  return CURATED_SKILL_METADATA[skillId] || null
}
