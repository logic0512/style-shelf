import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'

const dataDir = getDataDir()
const resultsFile = join(dataDir, 'results.json')
let writeChain = Promise.resolve()

export function resultImage(image, base = `http://127.0.0.1:${Number(process.env.STYLE_SHELF_PORT || 4317)}`) {
  if (typeof image !== 'string') return image
  try {
    const url = new URL(image, 'http://127.0.0.1')
    if (!['http:', 'https:'].includes(url.protocol) ||
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        !/^\/api\/jobs\/[^/]+\/output\/[^/]+$/.test(url.pathname)) return image
    return `${base}${url.pathname}${url.search}${url.hash}`
  } catch {
    return image
  }
}

async function readResultsUnsafe() {
  await mkdir(dataDir, { recursive: true })
  try {
    const results = JSON.parse(await readFile(resultsFile, 'utf8'))
    const base = `http://127.0.0.1:${Number(process.env.STYLE_SHELF_PORT || 4317)}`
    return Array.isArray(results)
      ? results.map((result) => result && typeof result === 'object'
        ? { ...result, image: resultImage(result.image, base) } : result)
      : results
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function writeResultsUnsafe(results) {
  await mkdir(dataDir, { recursive: true })
  const tempFile = `${resultsFile}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  const stored = results.map((result) => ({ ...result, image: resultImage(result.image, '') }))
  await writeFile(tempFile, `${JSON.stringify(stored, null, 2)}\n`, 'utf8')
  await rename(tempFile, resultsFile)
  return results
}

export async function readResults() {
  await writeChain
  return readResultsUnsafe()
}

// ponytail: one local process-wide write queue; per-user locking only if this becomes multi-user.
export function writeResults(results) {
  const operation = writeChain.then(() => writeResultsUnsafe(results))
  writeChain = operation.catch(() => {})
  return operation
}

export function updateResults(mutator) {
  const operation = writeChain.then(async () => {
    const current = await readResultsUnsafe()
    const next = await mutator(current)
    return writeResultsUnsafe(next)
  })
  writeChain = operation.catch(() => {})
  return operation
}

export function initializeResults(results) {
  const operation = writeChain.then(async () => {
    const current = await readResultsUnsafe()
    if (!Array.isArray(current)) throw new Error('invalid_results_store')
    if (current.length > 0) return null
    return writeResultsUnsafe(results)
  })
  writeChain = operation.catch(() => {})
  return operation
}
