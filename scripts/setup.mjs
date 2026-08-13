import { loadLocalEnv } from './load-env.mjs'
import { ensureStorageLayout, getDataDir, getGeneratedDir, getUploadsDir, migrateLegacyStorage } from '../server/storage.mjs'

await loadLocalEnv()
await ensureStorageLayout()
const migration = await migrateLegacyStorage()
console.log(`Style Shelf setup complete: ${getDataDir()}`)
console.log(`Uploads: ${getUploadsDir()}`)
console.log(`Generated: ${getGeneratedDir()}`)
console.log(`Migrated: ${migration.migratedInputs} uploads · ${migration.migratedArtifacts} generated images`)
