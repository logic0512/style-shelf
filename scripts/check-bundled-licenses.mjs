import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(await readFile(join(root, 'bundled-skills/manifest.json'), 'utf8'))
const rootLicense = await access(join(root, 'LICENSE')).then(() => true).catch(() => false)
const notices = await access(join(root, 'THIRD_PARTY_NOTICES.md')).then(() => true).catch(() => false)
const invalid = []

for (const skill of manifest.skills || []) {
  if (!skill?.id || !skill?.directory || !skill?.author || !skill?.source || !skill?.license || !skill?.licenseFile) {
    invalid.push(`${skill?.id || 'unknown'}:metadata`)
    continue
  }
  const directory = join(root, 'bundled-skills', skill.directory)
  const required = ['SKILL.md', skill.licenseFile]
  for (const filename of required) {
    const exists = await access(join(directory, filename)).then(() => true).catch(() => false)
    if (!exists) invalid.push(`${skill.id}:${filename}`)
  }
}

if (!rootLicense) {
  console.error('Release blocked: repository LICENSE is missing.')
}
if (!notices) {
  console.error('Release blocked: THIRD_PARTY_NOTICES.md is missing.')
}
if (invalid.length) console.error(`Release blocked: incomplete bundled Skill records: ${invalid.join(', ')}`)

if (!rootLicense || !notices || invalid.length) process.exit(1)
console.log(`Bundled Skill license check passed for ${manifest.skills.length} entries`)
