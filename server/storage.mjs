import { copyFile, lstat, readFile, readdir, mkdir, rename, realpath, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { loadLocalEnv } from '../scripts/load-env.mjs'

await loadLocalEnv()

const dataDir = resolve(process.env.STYLE_SHELF_DATA_DIR || join(process.cwd(), '.styleshelf-data'))
const libraryDir = resolve(process.env.STYLE_SHELF_LIBRARY_DIR || join(homedir(), 'Pictures', 'Style Shelf'))
const jobsDir = join(dataDir, 'jobs')
const tempDir = join(dataDir, 'temp')
const uploadsDir = join(libraryDir, 'Uploads')
const generatedDir = join(libraryDir, 'Generated')
const migrationMarker = join(dataDir, '.storage-migration-v1.json')

export function getDataDir() {
  return dataDir
}

export function getLibraryDir() {
  return libraryDir
}

export function getJobsDir() {
  return jobsDir
}

export function getTempDir() {
  return tempDir
}

export function getUploadsDir() {
  return uploadsDir
}

export function getGeneratedDir() {
  return generatedDir
}

export function getJobPaths(id) {
  return {
    jobDir: join(jobsDir, id),
    inputDir: join(uploadsDir, id),
    outputDir: join(tempDir, 'jobs', id, 'output'),
    legacyInputDir: join(jobsDir, id, 'input'),
    legacyOutputDir: join(jobsDir, id, 'output'),
    generatedDir: join(generatedDir, id),
  }
}

export async function ensureStorageLayout() {
  await mkdir(dataDir, { recursive: true })
  await mkdir(libraryDir, { recursive: true })
  await ensureStorageDirectory(jobsDir, dataDir)
  await ensureStorageDirectory(tempDir, dataDir)
  await ensureStorageDirectory(uploadsDir, libraryDir)
  await ensureStorageDirectory(generatedDir, libraryDir)
  await ensureStorageDirectory(join(dataDir, 'results'), dataDir)
  await ensureStorageDirectory(join(dataDir, 'skills'), dataDir)
  return {
    dataDir,
    libraryDir,
    uploadsDir,
    generatedDir,
  }
}

export function isPathInside(target, root) {
  const targetPath = resolve(target)
  const rootPath = resolve(root)
  const rel = relative(rootPath, targetPath)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

export async function ensureStorageDirectory(target, root) {
  await mkdir(target, { recursive: true })
  const [canonicalTarget, canonicalRoot] = await Promise.all([realpath(target), realpath(root)])
  if (!isPathInside(canonicalTarget, canonicalRoot)) throw new Error('unsafe_storage_path')
  return canonicalTarget
}

async function measureDirectory(root) {
  let bytes = 0
  let files = 0
  try {
    const entries = await readdir(root, { withFileTypes: true })
    for (const entry of entries) {
      const target = join(root, entry.name)
      if (entry.isDirectory()) {
        const child = await measureDirectory(target)
        bytes += child.bytes
        files += child.files
      } else if (entry.isFile()) {
        const info = await stat(target)
        bytes += info.size
        files += 1
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return { bytes, files }
}

export async function getStorageStats() {
  await ensureStorageLayout()
  const [uploads, generated, internal] = await Promise.all([
    measureDirectory(uploadsDir),
    measureDirectory(generatedDir),
    measureDirectory(dataDir),
  ])
  return {
    libraryDir,
    dataDir,
    uploads: { path: uploadsDir, ...uploads },
    generated: { path: generatedDir, ...generated },
    internal: { path: dataDir, ...internal },
  }
}

function safeFilename(filename) {
  return typeof filename === 'string' && filename.length > 0 && filename.length <= 200 && !/[\u0000-\u001f\u007f]/.test(filename) && basename(filename) === filename && filename !== '.' && filename !== '..'
}

async function copyAsset(source, target, sourceRoot) {
  try {
    const canonicalSource = await realpath(source)
    if (sourceRoot && !isPathInside(canonicalSource, sourceRoot)) return false
    const info = await stat(canonicalSource)
    if (!info.isFile()) return false
    await mkdir(dirname(target), { recursive: true })
    try {
      const targetInfo = await lstat(target)
      if (targetInfo.isSymbolicLink()) return false
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await copyFile(canonicalSource, target)
    }
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function safeLegacyPath(path, root, filename) {
  const candidate = typeof path === 'string' && isPathInside(path, root) ? path : join(root, filename)
  return isPathInside(candidate, root) ? candidate : null
}

async function writeJsonAtomic(path, value) {
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, path)
}

export async function migrateLegacyStorage() {
  await ensureStorageLayout()
  try {
    const marker = JSON.parse(await readFile(migrationMarker, 'utf8'))
    if (marker?.version === 1) return marker
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  let migratedInputs = 0
  let migratedArtifacts = 0
  const artifactPaths = new Map()
  let entries = []
  try {
    entries = await readdir(jobsDir, { withFileTypes: true })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const id = entry.name
    const jobFile = join(jobsDir, id, 'job.json')
    let job
    try {
      job = JSON.parse(await readFile(jobFile, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    const paths = getJobPaths(id)
    const inputRoot = await ensureStorageDirectory(paths.inputDir, uploadsDir)
    const generatedRoot = await ensureStorageDirectory(paths.generatedDir, generatedDir)
    let changed = false
    const inputs = []
    for (const input of Array.isArray(job.inputs) ? job.inputs : []) {
      if (!safeFilename(input?.filename)) {
        inputs.push(input)
        continue
      }
      const source = safeLegacyPath(input.path, paths.legacyInputDir, input.filename)
      const target = join(inputRoot, input.filename)
      if (source && isPathInside(target, inputRoot) && await copyAsset(source, target, paths.legacyInputDir)) {
        inputs.push({ ...input, path: target })
        changed = changed || input.path !== target
        migratedInputs += input.path === target ? 0 : 1
      } else {
        inputs.push(input)
      }
    }
    const artifacts = []
    for (const artifact of Array.isArray(job.artifacts) ? job.artifacts : []) {
      if (!safeFilename(artifact?.filename)) {
        artifacts.push(artifact)
        continue
      }
      const source = safeLegacyPath(artifact.path, paths.legacyOutputDir, artifact.filename)
      const target = join(generatedRoot, artifact.filename)
      if (source && isPathInside(target, generatedRoot) && await copyAsset(source, target, paths.legacyOutputDir)) {
        artifacts.push({ ...artifact, path: target })
        artifactPaths.set(`${id}/${artifact.filename}`, target)
        changed = changed || artifact.path !== target
        migratedArtifacts += artifact.path === target ? 0 : 1
      } else {
        artifacts.push(artifact)
      }
    }
    if (changed) {
      await writeJsonAtomic(jobFile, {
        ...job,
        inputs,
        artifacts,
        outputDir: paths.outputDir,
      })
    }
  }

  const resultsFile = join(dataDir, 'results.json')
  try {
    const results = JSON.parse(await readFile(resultsFile, 'utf8'))
    if (Array.isArray(results)) {
      const updated = results.map((result) => {
        const key = result?.jobId && result?.artifact?.filename ? `${result.jobId}/${result.artifact.filename}` : ''
        const path = artifactPaths.get(key)
        return path ? { ...result, artifact: { ...result.artifact, path } } : result
      })
      if (JSON.stringify(updated) !== JSON.stringify(results)) await writeJsonAtomic(resultsFile, updated)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const summary = { version: 1, migratedInputs, migratedArtifacts, completedAt: new Date().toISOString() }
  await writeJsonAtomic(migrationMarker, summary)
  return summary
}
