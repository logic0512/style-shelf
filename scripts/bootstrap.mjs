import { spawnSync } from 'node:child_process'
import { loadLocalEnv } from './load-env.mjs'
import { ensureStorageLayout, getGeneratedDir, getUploadsDir, migrateLegacyStorage } from '../server/storage.mjs'

await loadLocalEnv()
await ensureStorageLayout()
const migration = await migrateLegacyStorage()

console.log('Style Shelf bootstrap complete')
console.log(`Uploads: ${getUploadsDir()}`)
console.log(`Generated: ${getGeneratedDir()}`)
console.log(`Migrated: ${migration.migratedInputs} uploads · ${migration.migratedArtifacts} generated images`)

const doctor = spawnSync(process.execPath, ['scripts/doctor.mjs'], { stdio: 'inherit', env: process.env })
if (doctor.error) throw doctor.error
if (doctor.status !== 0) process.exit(doctor.status || 1)

if (process.argv.includes('--desktop')) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const desktop = spawnSync(npm, ['run', 'desktop'], { stdio: 'inherit', env: process.env })
  if (desktop.error) throw desktop.error
  process.exit(desktop.status || 0)
}
