import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'
import { copyFile, lstat, readFile, readdir, rename, realpath, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { ensureStorageDirectory, getGeneratedDir, getJobPaths, getJobsDir, getTempDir, getUploadsDir } from './storage.mjs'

const jobsDir = getJobsDir()
const JOB_ID = /^[A-Za-z0-9_-]{1,120}$/
let jobWriteChain = Promise.resolve()

function underRoot(target, root) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

function hasImageSignature(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return true
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return true
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return true
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return true
  if (buffer.length >= 2 && buffer.subarray(0, 2).toString() === 'BM') return true
  if (buffer.length >= 4 && (buffer.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || buffer.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])))) return true
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString() === 'ftyp') return ['heic', 'heix', 'avif', 'avis', 'mif1'].includes(buffer.subarray(8, 12).toString())
  return false
}

function assertJobId(id) {
  if (typeof id !== 'string' || !JOB_ID.test(id)) throw new Error('invalid_job_id')
}

function assertFilename(filename) {
  if (typeof filename !== 'string' || !filename || filename.length > 200 || basename(filename) !== filename || filename === '.' || filename === '..') {
    throw new Error('invalid_filename')
  }
}

async function writeJob(job) {
  const jobDir = join(jobsDir, job.id)
  await ensureStorageDirectory(jobDir, jobsDir)
  const tempFile = join(jobDir, `job.json.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`)
  await writeFile(tempFile, `${JSON.stringify(job, null, 2)}\n`, 'utf8')
  await rename(tempFile, join(jobDir, 'job.json'))
  return job
}

async function readJobUnsafe(id) {
  try {
    return JSON.parse(await readFile(join(jobsDir, id, 'job.json'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function enqueueJobWrite(operation) {
  const next = jobWriteChain.then(operation)
  jobWriteChain = next.catch(() => {})
  return next
}

export async function createJob({ id, skillId, promptId, payload }) {
  assertJobId(id)
  const hasSkill = typeof skillId === 'string' && skillId.trim() && skillId.length <= 200
  const hasPrompt = typeof promptId === 'string' && promptId.trim() && promptId.length <= 200
  if (Boolean(hasSkill) === Boolean(hasPrompt)) throw new Error('invalid_job_source')
  const now = new Date().toISOString()
  const initialTurnId = 'turn-01'
  const initialPayload = payload && typeof payload === 'object' ? payload : {}
  return enqueueJobWrite(async () => {
    const paths = getJobPaths(id)
    await ensureStorageDirectory(dirname(paths.outputDir), getTempDir())
    return writeJob({
      id,
      ...(hasSkill ? { skillId } : { promptId }),
      state: 'queued',
      message: '任务已创建，等待本地执行器',
      payload: initialPayload,
      inputs: [],
      turns: [{ id: initialTurnId, index: 1, state: 'queued', payload: initialPayload, inputFilenames: [], createdAt: now, updatedAt: now }],
      activeTurnId: initialTurnId,
      outputDir: paths.outputDir,
      createdAt: now,
      updatedAt: now,
    })
  })
}

export async function queueJobContinuation(id, payload, parentArtifactFilename = '') {
  assertJobId(id)
  return enqueueJobWrite(async () => {
    const current = await readJobUnsafe(id)
    if (!current) return null
    if (['running', 'queued', 'waiting_input'].includes(current.state)) throw new Error('job_busy')
    const now = new Date().toISOString()
    const turns = Array.isArray(current.turns) && current.turns.length
      ? current.turns
      : [{
        id: 'turn-01',
        index: 1,
        state: current.state || 'completed',
        payload: current.payload || {},
        inputFilenames: (current.inputs || []).map((input) => input.filename),
        artifactFilenames: (current.artifacts || []).map((artifact) => artifact.filename),
        createdAt: current.createdAt || new Date().toISOString(),
        updatedAt: current.updatedAt || new Date().toISOString(),
      }]
    const index = turns.length + 1
    const turnId = `turn-${String(index).padStart(2, '0')}`
    const nextPayload = payload && typeof payload === 'object' ? payload : {}
    const previousTurn = turns.at(-1)
    const inheritedInputFilenames = previousTurn?.inputFilenames?.length
      ? previousTurn.inputFilenames
      : (current.inputs || []).map((input) => input.filename)
    const selectedParent = parentArtifactFilename && (current.artifacts || []).some((artifact) => artifact.filename === parentArtifactFilename)
      ? parentArtifactFilename
      : current.artifacts?.at(-1)?.filename || null
    const turn = {
      id: turnId,
      index,
      state: 'queued',
      payload: nextPayload,
      inputFilenames: [...new Set(inheritedInputFilenames)],
      parentArtifactFilename: selectedParent,
      createdAt: now,
      updatedAt: now,
    }
    return writeJob({
      ...current,
      state: 'queued',
      progress: 5,
      message: `第 ${index} 轮修改已创建，等待本地执行器`,
      payload: nextPayload,
      turns: [...turns, turn],
      activeTurnId: turnId,
      updatedAt: now,
    })
  })
}

export async function readJob(id) {
  assertJobId(id)
  await jobWriteChain
  return readJobUnsafe(id)
}

export async function listJobs() {
  await jobWriteChain
  let entries
  try {
    entries = await readdir(jobsDir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const jobs = await Promise.all(entries.filter((entry) => entry.isDirectory() && JOB_ID.test(entry.name)).map((entry) => readJobUnsafe(entry.name)))
  return jobs.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export async function markInterruptedJobs() {
  const jobs = await listJobs()
  await Promise.all(jobs.filter((job) => job.state === 'running').map((job) => updateJob(job.id, {
    state: 'failed',
    progress: 0,
    message: '本地服务重新启动，未自动重复执行上一次未完成任务',
  })))
}

export async function updateJob(id, patch) {
  assertJobId(id)
  return enqueueJobWrite(async () => {
    const current = await readJobUnsafe(id)
    if (!current) return null
    return writeJob({ ...current, ...patch, updatedAt: new Date().toISOString() })
  })
}

export async function saveJobInput(id, filename, buffer, mime, fieldId = '', turnId = '') {
  assertFilename(filename)
  assertJobId(id)
  return enqueueJobWrite(async () => {
    const current = await readJobUnsafe(id)
    if (!current) return null
    const inputDir = getJobPaths(id).inputDir
    await ensureStorageDirectory(inputDir, getUploadsDir())
    const target = join(inputDir, filename)
    try {
      if ((await lstat(target)).isSymbolicLink()) throw new Error('unsafe_storage_path')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await writeFile(target, buffer)
    const input = { filename, path: target, mime, size: buffer.byteLength, ...(fieldId ? { fieldId } : {}), ...(turnId ? { turnId } : {}) }
    const inputs = [...(current.inputs || []).filter((item) => item.filename !== filename), input]
    const turns = (current.turns || []).map((turn) => turn.id === turnId
      ? { ...turn, inputFilenames: [...new Set([...(turn.inputFilenames || []), filename])], updatedAt: new Date().toISOString() }
      : turn)
    return writeJob({ ...current, inputs, turns, updatedAt: new Date().toISOString() })
  })
}

export async function saveJobArtifact(id, sourcePath, mime, turnId = '') {
  assertJobId(id)
  if (typeof sourcePath !== 'string' || !sourcePath.startsWith('/')) throw new Error('invalid_artifact_path')
  return enqueueJobWrite(async () => {
    const current = await readJobUnsafe(id)
    if (!current) return null
    const paths = getJobPaths(id)
    if (![paths.outputDir, paths.legacyOutputDir].includes(current.outputDir)) throw new Error('invalid_job_output_dir')
    const source = await stat(sourcePath)
    if (!source.isFile() || source.size > 50_000_000) throw new Error('invalid_artifact_file')
    const canonicalSource = await realpath(sourcePath)
    const outputRoot = current.outputDir === paths.outputDir ? getTempDir() : getJobsDir()
    await ensureStorageDirectory(dirname(current.outputDir), outputRoot)
    const jobRoot = await realpath(dirname(current.outputDir))
    const artifactRoots = [process.env.STYLE_SHELF_ARTIFACT_ROOT, join(homedir(), '.codex', 'generated_images')].filter(Boolean)
    const allowedGeneratedRoots = (await Promise.all(artifactRoots.map((root) => realpath(root).catch(() => null)))).filter(Boolean)
    if (!underRoot(canonicalSource, jobRoot) && !allowedGeneratedRoots.some((root) => underRoot(canonicalSource, root))) throw new Error('artifact_path_not_allowed')
    if (!hasImageSignature(await readFile(canonicalSource))) throw new Error('invalid_artifact_image')
    const artifacts = current.artifacts || []
    const extension = extname(sourcePath).toLowerCase() || '.png'
    const filename = `result-${String(artifacts.length + 1).padStart(2, '0')}${extension}`
    const outputDir = paths.generatedDir
    await ensureStorageDirectory(outputDir, getGeneratedDir())
    const target = join(outputDir, filename)
    try {
      if ((await lstat(target)).isSymbolicLink()) throw new Error('unsafe_storage_path')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await copyFile(sourcePath, target)
    const turn = turnId ? (current.turns || []).find((item) => item.id === turnId) : null
    const artifact = { filename, path: target, mime: mime || 'image/png', size: source.size, createdAt: new Date().toISOString(), ...(turnId ? { turnId } : {}), ...(turn ? { turnIndex: turn.index } : {}) }
    return writeJob({ ...current, artifacts: [...artifacts, artifact], updatedAt: new Date().toISOString() })
  })
}
