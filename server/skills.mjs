import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { access, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'
import { resolveSkillMetadata } from './skill-metadata.mjs'

const skillsFile = join(getDataDir(), 'skills.json')
const seedFile = join(process.cwd(), 'public', 'skill-catalog.json')
const codexSkillsRoot = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'skills')
const ID = /^[a-z0-9][a-z0-9._-]{1,119}$/
const FIELD_TYPES = new Set(['image', 'textarea', 'ratio', 'select', 'questions'])
const COVER_STATUSES = new Set(['generated', 'needs_sample'])
const COVER_FRAME_RATIOS = new Set(['4:5'])
let writeChain = Promise.resolve()

function validField(field) {
  if (!field || typeof field !== 'object' || typeof field.id !== 'string' || !FIELD_TYPES.has(field.type) || typeof field.label !== 'string') return false
  if (field.type === 'image' && field.multiple !== undefined && typeof field.multiple !== 'boolean') return false
  if (field.type === 'ratio') return Array.isArray(field.options) && field.options.length > 0 && field.options.every((option) => typeof option === 'string')
  if (field.type === 'select') return Array.isArray(field.options) && field.options.length > 0 && field.options.every((option) => option && typeof option.value === 'string' && typeof option.label === 'string')
  return true
}

function validCoverReference(cover) {
  if (typeof cover !== 'string' || cover.length === 0 || cover.length > 2000) return false
  if (cover.startsWith('/skill-assets/')) return true
  try {
    const parsed = new URL(cover)
    return ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.pathname.startsWith('/api/jobs/')
  } catch {
    return false
  }
}

function validSkill(skill) {
  const coverStatus = skill?.coverStatus || (skill?.cover ? 'generated' : 'needs_sample')
  const hasCover = validCoverReference(skill?.cover)
  return Boolean(
    skill && typeof skill === 'object' && ID.test(skill.id) &&
    typeof skill.name === 'string' && skill.name.trim() && skill.name.length <= 200 &&
    typeof skill.english === 'string' && skill.english.length <= 200 &&
    typeof skill.desc === 'string' && skill.desc.length <= 500 &&
    (!skill.sourceName || (typeof skill.sourceName === 'string' && skill.sourceName.length <= 200)) &&
    (!skill.sourceDescription || (typeof skill.sourceDescription === 'string' && skill.sourceDescription.length <= 1000)) &&
    (!skill.descriptionZh || (typeof skill.descriptionZh === 'string' && skill.descriptionZh.length <= 500)) &&
    (!skill.summaryZh || (typeof skill.summaryZh === 'string' && skill.summaryZh.length <= 160)) &&
    (!skill.styleSummaryZh || (typeof skill.styleSummaryZh === 'string' && skill.styleSummaryZh.length <= 300)) &&
    (!skill.subjectSummaryZh || (typeof skill.subjectSummaryZh === 'string' && skill.subjectSummaryZh.length <= 300)) &&
    (!skill.author || (typeof skill.author === 'string' && skill.author.length <= 200)) &&
    (!skill.sourceUrl || (typeof skill.sourceUrl === 'string' && skill.sourceUrl.length <= 1000)) &&
    (!skill.license || (typeof skill.license === 'string' && skill.license.length <= 300)) &&
    (!skill.distribution || ['bundled', 'external'].includes(skill.distribution)) &&
    (!skill.metadataSource || typeof skill.metadataSource === 'string') &&
    (skill.needsMetadataReview === undefined || typeof skill.needsMetadataReview === 'boolean') &&
    (skill.order === undefined || (Number.isInteger(skill.order) && skill.order >= 0)) &&
    typeof skill.mode === 'string' && typeof skill.modeLabel === 'string' &&
    Array.isArray(skill.scenes) && skill.scenes.length <= 8 && skill.scenes.every((item) => typeof item === 'string') &&
    typeof skill.version === 'string' && Array.isArray(skill.inputSchema) && skill.inputSchema.length <= 20 && skill.inputSchema.every(validField) &&
    (!skill.requiredAny || (Array.isArray(skill.requiredAny) && skill.requiredAny.every((id) => skill.inputSchema.some((field) => field.id === id)))) &&
    (!skill.interaction || typeof skill.interaction === 'string') &&
    (!skill.capabilities || (Array.isArray(skill.capabilities) && skill.capabilities.every((item) => typeof item === 'string'))) &&
    (!skill.usageKeys || (Array.isArray(skill.usageKeys) && skill.usageKeys.length <= 100000 && skill.usageKeys.every((item) => typeof item === 'string' && item.length <= 240))) &&
    (skill.needsReview === undefined || typeof skill.needsReview === 'boolean') &&
    (!skill.inputContractSource || typeof skill.inputContractSource === 'string') &&
    COVER_STATUSES.has(coverStatus) && (!skill.coverFrameRatio || COVER_FRAME_RATIOS.has(skill.coverFrameRatio)) &&
    (coverStatus === 'needs_sample' ? !skill.cover : hasCover)
  )
}

async function readSeed() {
  try {
    const seed = JSON.parse(await readFile(seedFile, 'utf8'))
    return Array.isArray(seed) ? Promise.all(seed.filter(validSkill).map(withInstallStatus)) : []
  } catch {
    return []
  }
}

async function withInstallStatus(skill) {
  if (skill.distribution !== 'external') return { ...skill, installed: true }
  const skillPath = join(codexSkillsRoot, skill.id, 'SKILL.md')
  const installed = await new Promise((resolve) => access(skillPath, constants.R_OK, (error) => resolve(!error)))
  return { ...skill, installed }
}

async function readSkillsUnsafe() {
  try {
    const stored = JSON.parse(await readFile(skillsFile, 'utf8'))
    if (Array.isArray(stored) && stored.every(validSkill)) {
      // 旧目录补入仓库随附的真实样例与权威元数据；不覆盖使用次数、封面和删除状态。
      const seedById = new Map((await readSeed()).map((skill) => [skill.id, skill]))
      return Promise.all(stored.map(async (skill) => {
        const seed = seedById.get(skill.id)
        const cover = skill.cover || seed?.cover || null
        const metadata = seed ? {
          name: seed.name,
          english: seed.english,
          desc: seed.desc,
          sourceName: seed.sourceName,
          sourceDescription: seed.sourceDescription,
          summaryZh: seed.summaryZh,
          descriptionZh: seed.descriptionZh,
          styleSummaryZh: seed.styleSummaryZh,
          subjectSummaryZh: seed.subjectSummaryZh,
          metadataSource: seed.metadataSource,
          needsMetadataReview: seed.needsMetadataReview,
          author: seed.author,
          sourceUrl: seed.sourceUrl,
          license: seed.license,
          distribution: seed.distribution,
        } : {}
        if (!seed) {
          const skillPath = join(codexSkillsRoot, skill.id, 'SKILL.md')
          try {
            await new Promise((resolve, reject) => access(skillPath, constants.R_OK, (error) => error ? reject(error) : resolve()))
            const source = await readFile(skillPath, 'utf8')
            const resolved = resolveSkillMetadata(skill.id, source, { mode: skill.mode })
            Object.assign(metadata, {
              name: resolved.name,
              english: resolved.name.toUpperCase(),
              desc: resolved.desc.slice(0, 500),
              sourceName: resolved.sourceName,
              sourceDescription: resolved.sourceDescription.slice(0, 1000),
              summaryZh: resolved.summaryZh.slice(0, 160),
              descriptionZh: resolved.descriptionZh.slice(0, 500),
              styleSummaryZh: resolved.styleSummaryZh.slice(0, 300),
              subjectSummaryZh: resolved.subjectSummaryZh.slice(0, 300),
              metadataSource: resolved.metadataSource,
              needsMetadataReview: resolved.needsMetadataReview,
            })
          } catch {}
        }
        return withInstallStatus({
          ...skill,
          ...metadata,
          ...(cover && !skill.cover ? { cover, samples: seed.samples } : {}),
          coverStatus: skill.coverStatus || (cover ? 'generated' : 'needs_sample'),
          coverSource: skill.coverSource || (cover ? (seed?.coverSource || 'skill-output') : 'none'),
          coverFrameRatio: skill.coverFrameRatio || seed?.coverFrameRatio || '4:5',
          ready: Boolean(cover),
        })
      }))
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return readSeed()
}

async function writeSkillsUnsafe(skills) {
  await mkdir(getDataDir(), { recursive: true })
  const tempFile = `${skillsFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempFile, `${JSON.stringify(skills, null, 2)}\n`, 'utf8')
  await rename(tempFile, skillsFile)
  return skills
}

function sortSkills(skills) {
  return skills
    .map((skill, index) => ({ skill, index }))
    .sort((a, b) => (Number.isInteger(a.skill.order) ? a.skill.order : Number.MAX_SAFE_INTEGER) - (Number.isInteger(b.skill.order) ? b.skill.order : Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ skill }) => skill)
}

function enqueue(operation) {
  const next = writeChain.then(operation)
  writeChain = next.catch(() => {})
  return next
}

export async function listSkills() {
  await writeChain
  return sortSkills((await readSkillsUnsafe()).filter((skill) => !skill.deletedAt))
}

export async function listDeletedSkills() {
  await writeChain
  return sortSkills((await readSkillsUnsafe()).filter((skill) => skill.deletedAt))
}

export function createSkill(skill) {
  return enqueue(async () => {
    if (!validSkill(skill)) throw new Error('invalid_skill_manifest')
    const current = await readSkillsUnsafe()
    if (current.some((item) => item.id === skill.id)) throw new Error('skill_already_exists')
    return writeSkillsUnsafe([...current, skill])
  })
}

export function updateSkill(id, patch) {
  return enqueue(async () => {
    const current = await readSkillsUnsafe()
    const index = current.findIndex((item) => item.id === id)
    if (index < 0) return null
    const next = { ...current[index], ...patch, id }
    if (!Object.prototype.hasOwnProperty.call(patch, 'works')) next.works = current[index].works
    if (!validSkill(next)) throw new Error('invalid_skill_manifest')
    const skills = current.map((item, itemIndex) => itemIndex === index ? next : item)
    return writeSkillsUnsafe(skills)
  })
}

export function recordSkillPublication(id, usageKey) {
  return enqueue(async () => {
    const current = await readSkillsUnsafe()
    const index = current.findIndex((item) => item.id === id)
    if (index < 0) return null
    const usageKeys = Array.isArray(current[index].usageKeys) ? current[index].usageKeys : []
    if (usageKey && usageKeys.includes(usageKey)) return { counted: false, skills: current }
    const currentWorks = Number.isFinite(current[index].works) ? current[index].works : 0
    const skills = current.map((item, itemIndex) => itemIndex === index
      ? { ...item, works: currentWorks + 1, ...(usageKey ? { usageKeys: [...usageKeys, usageKey] } : {}) }
      : item)
    return { counted: true, skills: await writeSkillsUnsafe(skills) }
  })
}

export function deleteSkill(id) {
  return enqueue(async () => {
    // 这里只标记工作台目录记录；不删除 Codex 的原始 Skill 文件。
    const current = await readSkillsUnsafe()
    if (!current.some((item) => item.id === id && !item.deletedAt)) return null
    return writeSkillsUnsafe(current.map((item) => item.id === id ? { ...item, deletedAt: new Date().toISOString() } : item))
  })
}

export function restoreSkill(id) {
  return enqueue(async () => {
    const current = await readSkillsUnsafe()
    if (!current.some((item) => item.id === id && item.deletedAt)) return null
    return writeSkillsUnsafe(current.map((item) => {
      if (item.id !== id) return item
      const { deletedAt, ...rest } = item
      return rest
    }))
  })
}
