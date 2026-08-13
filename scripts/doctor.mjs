import { access, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { loadLocalEnv } from './load-env.mjs'
import { ensureStorageLayout, getStorageStats } from '../server/storage.mjs'

await loadLocalEnv()

const dataDir = process.env.STYLE_SHELF_DATA_DIR || join(process.cwd(), '.styleshelf-data')
const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex')
const checks = []

function pass(name, detail = '') {
  checks.push(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}

function warn(name, detail) {
  checks.push(`WARN  ${name} — ${detail}`)
}

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)
if ((nodeMajor === 20 && nodeMinor >= 19) || (nodeMajor === 22 && nodeMinor >= 12) || nodeMajor > 22) pass('Node.js', process.versions.node)
else throw new Error(`Node.js 20.19+ or 22.12+ required, found ${process.versions.node}`)

const catalog = JSON.parse(await readFile(join(process.cwd(), 'public/skill-catalog.json'), 'utf8'))
if (!Array.isArray(catalog)) throw new Error('public/skill-catalog.json must contain an array')
pass('Skill catalog', `${catalog.length} entries`)

await ensureStorageLayout()
const probe = join(dataDir, `.doctor-${process.pid}.tmp`)
await writeFile(probe, 'ok', 'utf8')
await unlink(probe)
pass('Local data directory', dataDir)
const storage = await getStorageStats()
pass('Image library', `${storage.uploads.path} / ${storage.generated.path}`)

const pythonCommand = process.platform === 'win32' ? 'python' : 'python3'
const pythonCheck = spawnSync(pythonCommand, ['--version'], { stdio: 'ignore' })
if (pythonCheck.status === 0) pass('Python runtime', pythonCommand)
else warn('Python runtime', `${pythonCommand} not found; remote Skill installation will be unavailable`)

const runtimeCandidates = [
  process.env.CODEX_BIN,
  process.platform === 'darwin' ? '/Applications/ChatGPT.app/Contents/Resources/codex' : null,
  process.platform === 'darwin' ? '/Applications/Codex.app/Contents/Resources/codex' : null,
  'codex',
].filter(Boolean)
let runtimeFound = ''
for (const candidate of runtimeCandidates) {
  const check = spawnSync(candidate, ['--version'], { stdio: 'ignore' })
  if (check.status === 0) {
    runtimeFound = candidate
    break
  }
}
if (runtimeFound) pass('Codex runtime', runtimeFound)
else warn('Codex runtime', 'not found; local Job execution will remain unavailable until Codex is installed or CODEX_BIN is configured')

try {
  await access(join(codexHome, 'skills'))
  const entries = await readdir(join(codexHome, 'skills'), { withFileTypes: true })
  const count = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).length
  pass('Codex Skill directory', `${codexHome}/skills (${count} directories)`)
} catch {
  warn('Codex Skill directory', `${codexHome}/skills not found; local Skill import and real runs need Codex installed`)
}

console.log(checks.join('\n'))
console.log(checks.some((line) => line.startsWith('WARN')) ? 'doctor: pass with warnings' : 'doctor: pass')
