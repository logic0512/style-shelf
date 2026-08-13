import { access, cp, mkdir, readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const SKILL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{1,119}$/

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function getBundleRoot() {
  return resolve(process.env.STYLE_SHELF_BUNDLED_SKILLS_DIR || join(process.cwd(), 'bundled-skills'))
}

function getCodexSkillsRoot() {
  return resolve(process.env.CODEX_SKILLS_ROOT || join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'skills'))
}

export async function seedBundledSkills() {
  const bundleRoot = getBundleRoot()
  const manifestPath = join(bundleRoot, 'manifest.json')
  if (!(await exists(manifestPath))) return { source: bundleRoot, installed: [], skipped: [], warnings: ['bundled_manifest_missing'] }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const entries = Array.isArray(manifest.skills) ? manifest.skills : []
  const skillsRoot = getCodexSkillsRoot()
  const installed = []
  const skipped = []
  const warnings = []
  await mkdir(skillsRoot, { recursive: true })

  for (const entry of entries) {
    const id = entry?.id
    const directory = entry?.directory || id
    if (!SKILL_ID.test(id || '') || !SKILL_ID.test(directory || '')) {
      warnings.push(`invalid_bundle_entry:${id || 'unknown'}`)
      continue
    }
    const sourceDir = join(bundleRoot, directory)
    const sourceManifest = join(sourceDir, 'SKILL.md')
    const targetDir = join(skillsRoot, id)
    const targetManifest = join(targetDir, 'SKILL.md')
    if (!(await exists(sourceManifest))) {
      warnings.push(`bundle_skill_manifest_missing:${id}`)
      continue
    }
    if (await exists(targetManifest)) {
      skipped.push(id)
      continue
    }
    if (await exists(targetDir)) {
      warnings.push(`skill_directory_exists_without_manifest:${id}`)
      continue
    }
    await mkdir(dirname(targetDir), { recursive: true })
    await cp(sourceDir, targetDir, { recursive: true, force: false, errorOnExist: true })
    installed.push(id)
  }
  return { source: bundleRoot, installed, skipped, warnings }
}

export async function listBundledSkills() {
  const root = getBundleRoot()
  try {
    const entries = await readdir(root, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory() && SKILL_ID.test(entry.name)).map((entry) => entry.name)
  } catch {
    return []
  }
}
