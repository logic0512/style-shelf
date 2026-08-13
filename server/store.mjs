import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'

const dataDir = getDataDir()
const resultsFile = join(dataDir, 'results.json')
let writeChain = Promise.resolve()

async function readResultsUnsafe() {
  await mkdir(dataDir, { recursive: true })
  try {
    return JSON.parse(await readFile(resultsFile, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function writeResultsUnsafe(results) {
  await mkdir(dataDir, { recursive: true })
  const tempFile = `${resultsFile}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  await writeFile(tempFile, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
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
