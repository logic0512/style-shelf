
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
  const sourceName = frontmatter.name || skillId
  const sourceDescription = frontmatter.description || ''
  const generated = generatedMetadata({ skillId, sourceName, sourceDescription, content, mode: options.mode })
  const sourceChineseDescription = chineseDescriptionFromSource(content)
  const descriptionZh = explicit?.descriptionZh || sourceChineseDescription || generated.descriptionZh
  const styleSummaryZh = explicit?.styleSummaryZh || generated.styleSummaryZh
  const subjectSummaryZh = explicit?.subjectSummaryZh || generated.subjectSummaryZh
  const summaryZh = explicit?.summaryZh || generated.summaryZh
  return {
    name: sourceName,
    sourceName,
    sourceDescription,
    summaryZh,
    descriptionZh,
    styleSummaryZh,
    subjectSummaryZh,
    desc: descriptionZh,
    metadataSource: explicit ? 'explicit' : sourceChineseDescription ? 'source' : 'generated',
    needsMetadataReview: false,
  }
}
