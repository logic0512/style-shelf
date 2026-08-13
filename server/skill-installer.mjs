import { access, constants } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createSkill, listDeletedSkills, listSkills, restoreSkill, updateSkill } from './skills.mjs'
import { resolveSkillMetadata } from './skill-metadata.mjs'

const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex')
const SKILLS_ROOT = join(CODEX_HOME, 'skills')
const INSTALLER = join(CODEX_HOME, 'skills', '.system', 'skill-installer', 'scripts', 'install-skill-from-github.py')
const LISTER = join(CODEX_HOME, 'skills', '.system', 'skill-installer', 'scripts', 'list-skills.py')
const SKILL_ID = /^[a-z0-9][a-z0-9._-]{1,119}$/

function runPython(script, args, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const python = process.platform === 'win32' ? 'python' : 'python3'
    const child = spawn(python, [script, ...args], { env: { ...process.env, CODEX_HOME }, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('skill_install_timeout')) }, timeoutMs)
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error((stderr || stdout || `skill_install_exit_${code}`).trim().slice(0, 500)))
    })
  })
}

function parseSource(source) {
  if (typeof source !== 'string') throw new Error('skill_source_required')
  const value = source.trim()
  if (!value || value.length > 500) throw new Error('skill_source_required')
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    if (!SKILL_ID.test(value)) throw new Error('invalid_skill_name')
    return { name: value }
  }
  let url
  try { url = new URL(value) } catch { throw new Error('invalid_github_source') }
  if (url.hostname !== 'github.com') throw new Error('only_github_sources_supported')
  let rawPath
  try { rawPath = decodeURIComponent(value.replace(/^https?:\/\/github\.com/i, '').split(/[?#]/, 1)[0]) } catch { throw new Error('invalid_github_source') }
  if (rawPath.split('/').some((segment) => segment === '..')) throw new Error('invalid_github_path')
  let pathname
  try { pathname = decodeURIComponent(url.pathname) } catch { throw new Error('invalid_github_source') }
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error('invalid_github_source')
  let path = '.'
  if (parts[2] === 'tree' || parts[2] === 'blob') {
    if (parts.length < 5) throw new Error('github_skill_path_required')
    path = parts.slice(4).join('/')
    if (path.split('/').some((segment) => segment === '..')) throw new Error('invalid_github_path')
  }
  return { url: value, path }
}

const CURATED_INPUT_CONTRACTS = {
  'photo-abstract-editorial': {
    mode: 'image',
    fields: [{ id: 'source_images', type: 'image', label: '原图', required: true, hint: '图片会复制到当前任务目录，不会移动原文件' }],
    capabilities: ['imageToImage'],
  },
  'gc-minimal-zine-poster-v0-1': {
    mode: 'text',
    fields: [
      { id: 'direction', type: 'textarea', label: '想法 / 文案', required: true, placeholder: '写下想压成海报的那句话或那个观点' },
      { id: 'ratio', type: 'ratio', label: '画幅', options: ['3:4', '1:1', '16:9'] },
    ],
    capabilities: ['textToImage'],
  },
  'scene-distillation-zine-v1-3': {
    mode: 'mixed',
    fields: [
      { id: 'source_images', type: 'image', label: '主体图', required: true, hint: '先提供一张照片，再补充希望保留的动作或情绪' },
      { id: 'direction', type: 'textarea', label: '补充描述', placeholder: '描述想保留的动作、情绪或氛围' },
    ],
    capabilities: ['imageToImage', 'textToImage'],
  },
  'scenes-gathered-zine-v1-3': {
    mode: 'mixed',
    fields: [
      { id: 'source_images', type: 'image', label: '原图', required: true, hint: '先提供照片，文字可以补充你想强调的方向' },
      { id: 'direction', type: 'textarea', label: '你的想法（可选）', placeholder: '写下想保留、强调或加入的主体、空间、情绪或文案' },
    ],
    interaction: 'guided_optional',
    capabilities: ['imageToImage', 'textToImage'],
  },
  'daily-photo-playground': {
    mode: 'mixed',
    fields: [
      { id: 'source_images', type: 'image', label: '原图', required: true, hint: '照片是这个 Skill 的核心工作材料' },
      { id: 'direction', type: 'textarea', label: '补充方向（可选）', placeholder: '补充想保留的情绪、动作或视觉重点' },
    ],
    capabilities: ['imageToImage', 'textToImage'],
  },
  'vinyl-image-generator': {
    mode: 'mixed',
    fields: [
      { id: 'source_images', type: 'image', label: '参考图（可选）', multiple: true, hint: '可以提供一张或多张图片作为视觉证据' },
      { id: 'direction', type: 'textarea', label: '想法 / 记忆 / 故事', placeholder: '写下记忆、句子、情绪、故事、物体或地点' },
    ],
    requiredAny: ['source_images', 'direction'],
    capabilities: ['imageToImage', 'textToImage', 'multiImage'],
  },
  'ian-xiaohei-illustrations': {
    mode: 'text',
    fields: [{ id: 'direction', type: 'textarea', label: '文章 / 观点 / 文案', required: true, placeholder: '粘贴文章、观点或希望表达的结构' }],
    capabilities: ['textToImage'],
  },
}

function normalizeInputContract(contract, source) {
  if (!contract || !Array.isArray(contract.fields) || contract.fields.length === 0) return null
  const fields = contract.fields.filter((field) => field && typeof field.id === 'string' && typeof field.type === 'string').map((field) => ({
    ...field,
    label: typeof field.label === 'string' && field.label.trim() ? field.label : field.type === 'image' ? '参考图' : field.type === 'textarea' ? '补充想法' : field.id,
    required: Boolean(field.required),
  }))
  if (!fields.length) return null
  return {
    mode: ['text', 'image', 'mixed'].includes(contract.mode) ? contract.mode : 'mixed',
    fields,
    requiredAny: Array.isArray(contract.requiredAny) ? contract.requiredAny.filter((id) => fields.some((field) => field.id === id)) : [],
    interaction: typeof contract.interaction === 'string' ? contract.interaction : 'none',
    capabilities: Array.isArray(contract.capabilities) ? contract.capabilities.filter((item) => typeof item === 'string') : [],
    needsReview: Boolean(contract.needsReview),
    inputContractSource: source,
  }
}

function readExplicitInputContract(content) {
  const block = content.match(/<!--\s*styleshelf-input\s*([\s\S]*?)\s*-->/i)?.[1]?.replace(/styleshelf-input\s*$/i, '').trim()
  if (!block) return null
  try {
    return normalizeInputContract(JSON.parse(block.trim()), 'explicit')
  } catch {
    return null
  }
}

function inferInputContract(skillId, content) {
  const explicit = readExplicitInputContract(content)
  if (explicit) return explicit
  const curated = normalizeInputContract(CURATED_INPUT_CONTRACTS[skillId], 'curated')
  if (curated) return curated

  const lower = content.toLowerCase()
  const hasImageInput = /user[- ]provided\s+(?:photo|image)|supplied\s+(?:photo|image)|source\s+(?:photo|image)|uploaded\s+(?:photo|image)|reference\s+(?:photo|image)|input\s+(?:photo|image)|用户(?:提供|上传)的?(?:图片|照片)|原图|参考图/.test(lower)
  const clearTextOnly = /text[- ]only|文字 בלבד|仅支持文字|only (?:reads?|accepts?) (?:the )?(?:article|text|prompt)|中文文章.*正文配图|正文配图/.test(lower)
  if (clearTextOnly && !hasImageInput) {
    return normalizeInputContract({
      mode: 'text',
      fields: [{ id: 'direction', type: 'textarea', label: '想法 / 文案', required: true, placeholder: '写下想生成的内容' }],
      capabilities: ['textToImage'],
      needsReview: true,
    }, 'heuristic:text-only')
  }

  // Default for new Skills: keep the input open instead of silently reducing
  // an ambiguous description to text-only. The review flag makes uncertainty visible.
  return normalizeInputContract({
    mode: 'mixed',
    fields: [
      { id: 'source_images', type: 'image', label: '参考图（可选）', multiple: true, hint: '可以上传一张或多张图片作为视觉参考' },
      { id: 'direction', type: 'textarea', label: '你的想法（可选）', placeholder: '写下想生成、保留或改变的内容' },
    ],
    requiredAny: ['source_images', 'direction'],
    capabilities: ['imageToImage', 'textToImage', 'multiImage'],
    needsReview: true,
  }, 'heuristic:open')
}

async function readManifest(skillId) {
  const skillPath = join(SKILLS_ROOT, skillId, 'SKILL.md')
  await new Promise((resolve, reject) => access(skillPath, constants.R_OK, (error) => error ? reject(new Error('installed_skill_manifest_missing')) : resolve()))
  const content = await readFile(skillPath, 'utf8')
  const contract = inferInputContract(skillId, content)
  const metadata = resolveSkillMetadata(skillId, content, { mode: contract.mode })
  const english = metadata.name.toUpperCase()
  const modeLabel = contract.mode === 'text' ? '文字生图' : contract.mode === 'image' ? '图片转绘' : '图片 + 文字'
  return {
    id: skillId,
    index: 'S.99',
    name: metadata.name,
    english,
    desc: metadata.desc.slice(0, 500),
    sourceName: metadata.sourceName,
    sourceDescription: metadata.sourceDescription.slice(0, 1000),
    summaryZh: metadata.summaryZh.slice(0, 160),
    descriptionZh: metadata.descriptionZh.slice(0, 500),
    styleSummaryZh: metadata.styleSummaryZh.slice(0, 300),
    subjectSummaryZh: metadata.subjectSummaryZh.slice(0, 300),
    metadataSource: metadata.metadataSource,
    needsMetadataReview: metadata.needsMetadataReview,
    mode: contract.mode,
    modeLabel,
    scenes: ['新导入 Skill'],
    version: 'local',
    works: 0,
    theme: 'gather',
    ready: false,
    coverStatus: 'needs_sample',
    coverSource: 'none',
    coverFrameRatio: '4:5',
    cover: null,
    inputSchema: contract.fields,
    requiredAny: contract.requiredAny,
    interaction: contract.interaction,
    capabilities: contract.capabilities,
    needsReview: contract.needsReview,
    inputContractSource: contract.inputContractSource,
  }
}

export async function listLocalSkills(query = '') {
  const needle = typeof query === 'string' ? query.trim().toLowerCase().slice(0, 120) : ''
  const catalog = await listSkills()
  let entries = []
  try {
    entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const skills = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || !SKILL_ID.test(entry.name)) continue
    try {
      const skill = await readManifest(entry.name)
      const haystack = `${skill.id} ${skill.name} ${skill.desc}`.toLowerCase()
      if (!needle || haystack.includes(needle)) skills.push({ ...skill, inCatalog: catalog.some((item) => item.id === skill.id) })
    } catch {}
  }
  return skills.sort((a, b) => a.id.localeCompare(b.id)).slice(0, 100)
}

export async function installSkill(source) {
  const parsed = parseSource(source)
  let skillId = parsed.name
  if (parsed.url) {
    skillId = parsed.path === '.' ? parsed.url.split('/').filter(Boolean).at(-1) : parsed.path.split('/').filter(Boolean).at(-1)
    if (!SKILL_ID.test(skillId)) throw new Error('invalid_skill_name')
    await runPython(INSTALLER, ['--url', parsed.url, '--path', parsed.path])
  } else {
    const existingPath = join(SKILLS_ROOT, skillId, 'SKILL.md')
    try {
      await new Promise((resolve, reject) => access(existingPath, constants.R_OK, (error) => error ? reject(error) : resolve()))
    } catch {
      const listed = JSON.parse((await runPython(LISTER, ['--format', 'json'])).stdout)
      if (!listed.some((item) => item.name === skillId)) throw new Error('skill_name_not_found')
      await runPython(INSTALLER, ['--repo', 'openai/skills', '--path', `skills/.curated/${skillId}`])
    }
  }
  if (!SKILL_ID.test(skillId)) throw new Error('invalid_skill_name')
  const current = await listSkills()
  const existing = current.find((skill) => skill.id === skillId)
  const manifest = await readManifest(skillId)
  const { works: _ignoredWorks, ...manifestWithoutWorks } = manifest
  let skills
  if (existing) {
    const preserved = ['scenes', 'theme', 'cover', 'samples', 'coverStatus', 'coverSource', 'coverFrameRatio', 'coverPosition']
      .reduce((next, key) => existing[key] === undefined ? next : { ...next, [key]: existing[key] }, {})
    skills = await updateSkill(skillId, { ...manifestWithoutWorks, ...preserved })
  }
  else if ((await listDeletedSkills()).some((skill) => skill.id === skillId)) {
    await restoreSkill(skillId)
    skills = await updateSkill(skillId, manifestWithoutWorks)
  } else skills = await createSkill(manifest)
  return Array.isArray(skills) ? skills.find((skill) => skill.id === skillId) || manifest : manifest
}

export { inferInputContract }
