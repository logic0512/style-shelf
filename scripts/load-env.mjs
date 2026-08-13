import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function loadLocalEnv(cwd = process.cwd()) {
  let content
  try {
    content = await readFile(join(cwd, '.env'), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match || process.env[match[1]] !== undefined) continue
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
    process.env[match[1]] = value
  }
}
