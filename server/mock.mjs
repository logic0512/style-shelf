import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { readResults, initializeResults, updateResults } from './store.mjs'
import { createJob, listJobs, markInterruptedJobs, readJob, updateJob, saveJobInput, queueJobContinuation } from './jobs.mjs'
import { cancelJobRun, configureExecutor, describeExecutor, initializeExecutorSelection, startJobRun } from './executor.mjs'
import { createSkill, deleteSkill, listDeletedSkills, listSkills, recordSkillPublication, restoreSkill, updateSkill } from './skills.mjs'
import { createPrompt, deletePrompt, getPrompt, listPrompts, updatePrompt } from './prompts.mjs'
import { installSkill, listLocalSkills } from './skill-installer.mjs'
import { seedBundledSkills } from './bundled-skills.mjs'
import { ensureStorageLayout, getGeneratedDir, getJobPaths, getStorageStats, getUploadsDir, isPathInside, migrateLegacyStorage } from './storage.mjs'

const port = Number(process.env.STYLE_SHELF_PORT || 4317)
const frontendPort = process.env.STYLE_SHELF_FRONTEND_PORT || '4173'
const webRoot = resolve(process.env.STYLE_SHELF_WEB_ROOT || join(process.cwd(), 'dist'))
const allowedOrigins = new Set([`http://127.0.0.1:${frontendPort}`, `http://localhost:${frontendPort}`])
const COVER_RATIOS = new Set(['4:3', '3:4'])

function validPosition(position) {
  return position == null || (
    Number.isFinite(position.x) && Number.isFinite(position.y) &&
    position.x >= 0 && position.x <= 100 && position.y >= 0 && position.y <= 100
  )
}

function validResult(result) {
  return Boolean(
    result && typeof result === 'object' &&
    typeof result.id === 'string' && result.id.trim() && result.id.length <= 200 &&
    typeof result.title === 'string' && result.title.length <= 500 &&
    typeof result.styleName === 'string' && result.styleName.length <= 200 &&
    validImageReference(result.image) &&
    COVER_RATIOS.has(result.coverRatio) && validPosition(result.coverPosition)
  )
}

function validImageReference(image) {
  if (image == null) return true
  if (typeof image !== 'string' || image.length > 2000) return false
  if (image.startsWith('/skill-assets/')) return true
  try {
    const url = new URL(image)
    return ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.startsWith('/api/jobs/')
  } catch {
    return false
  }
}

function validResults(results) {
  return Array.isArray(results) && results.length <= 10_000 && results.every(validResult)
}

function validProgress(progress) {
  return progress == null || (Number.isFinite(progress) && progress >= 0 && progress <= 100)
}

function hasImageSignature(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return true
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return true
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString() === 'GIF87a' || buffer.subarray(0, 6).toString() === 'GIF89a')) return true
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return true
  if (buffer.length >= 2 && buffer.subarray(0, 2).toString() === 'BM') return true
  if (buffer.length >= 4 && (buffer.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || buffer.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])))) return true
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString() === 'ftyp') return ['heic', 'heix', 'avif', 'avis', 'mif1'].includes(buffer.subarray(8, 12).toString())
  return false
}

async function safeAssetPath(path, roots) {
  if (typeof path !== 'string') return null
  const canonicalPath = await realpath(path).catch(() => null)
  if (!canonicalPath) return null
  const canonicalRoots = (await Promise.all(roots.map(async (root) => {
    const canonicalRoot = await realpath(root).catch(() => null)
    return canonicalRoot && isPathInside(canonicalRoot, resolve(root)) ? canonicalRoot : null
  }))).filter(Boolean)
  return canonicalRoots.some((root) => isPathInside(canonicalPath, root)) ? canonicalPath : null
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

async function serveWebAsset(request, response) {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
  } catch {
    sendJson(response, 400, { error: 'invalid_path' })
    return true
  }
  if (pathname.includes('\u0000')) {
    sendJson(response, 400, { error: 'invalid_path' })
    return true
  }
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1)
  const candidate = resolve(webRoot, requested)
  if (!isPathInside(candidate, webRoot)) {
    sendJson(response, 400, { error: 'invalid_path' })
    return true
  }
  let asset = candidate
  try {
    const info = await stat(asset)
    if (!info.isFile()) throw Object.assign(new Error('not_file'), { code: 'ENOENT' })
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
    if (pathname !== '/' && !extname(pathname)) asset = join(webRoot, 'index.html')
    else {
      response.writeHead(404)
      response.end()
      return true
    }
  }
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
  }
  response.writeHead(200, { 'content-type': types[extname(asset).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' })
  response.end(await readFile(asset))
  return true
}

async function readBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 2_000_000) throw new Error('payload_too_large')
  }
  return body ? JSON.parse(body) : null
}

async function readBuffer(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 20_000_000) throw new Error('payload_too_large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: 'origin_not_allowed' })
    return
  }
  if (origin) response.setHeader('access-control-allow-origin', origin)
  response.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (!request.url.startsWith('/api/')) {
    await serveWebAsset(request, response)
    return
  }

  if (request.url === '/api/health') {
    const storage = await getStorageStats()
    sendJson(response, 200, {
      ok: true,
      service: 'style-shelf-local',
      mode: 'phase-2',
      dataDir: storage.dataDir,
      libraryDir: storage.libraryDir,
      executor: describeExecutor(),
    })
    return
  }

  try {
    if (request.method === 'POST' && request.url === '/api/executor') {
      const payload = await readBody(request)
      sendJson(response, 200, { executor: await configureExecutor(payload?.id) })
      return
    }
    if (request.method === 'POST' && request.url === '/api/skills/install') {
      const payload = await readBody(request)
      const skill = await installSkill(payload?.source)
      sendJson(response, 201, { skill })
      return
    }
    if (request.method === 'GET' && new URL(request.url, 'http://127.0.0.1').pathname === '/api/skills/local') {
      const url = new URL(request.url, 'http://127.0.0.1')
      sendJson(response, 200, { skills: await listLocalSkills(url.searchParams.get('q') || '') })
      return
    }
    if (request.method === 'GET' && request.url === '/api/skills/trash') {
      sendJson(response, 200, { skills: await listDeletedSkills() })
      return
    }
    const restoreMatch = request.url.match(/^\/api\/skills\/([^/]+)\/restore$/)
    if (request.method === 'POST' && restoreMatch) {
      const skills = await restoreSkill(decodeURIComponent(restoreMatch[1]))
      sendJson(response, skills ? 200 : 404, skills ? { skills: skills.filter((skill) => !skill.deletedAt) } : { error: 'skill_not_found' })
      return
    }
    const skillMatch = request.url.match(/^\/api\/skills(?:\/([^/]+))?$/)
    if (request.method === 'GET' && skillMatch) {
      sendJson(response, 200, { skills: await listSkills() })
      return
    }
    if (request.method === 'POST' && skillMatch && !skillMatch[1]) {
      const skills = await createSkill(await readBody(request))
      sendJson(response, 201, { skill: skills[skills.length - 1] })
      return
    }
    if (request.method === 'PATCH' && skillMatch?.[1]) {
      const skills = await updateSkill(decodeURIComponent(skillMatch[1]), await readBody(request))
      sendJson(response, skills ? 200 : 404, skills ? { skills } : { error: 'skill_not_found' })
      return
    }
    if (request.method === 'DELETE' && skillMatch?.[1]) {
      const skills = await deleteSkill(decodeURIComponent(skillMatch[1]))
      sendJson(response, skills ? 200 : 404, skills ? { skills } : { error: 'skill_not_found' })
      return
    }

    const promptMatch = request.url.match(/^\/api\/prompts(?:\/([^/]+))?$/)
    if (request.method === 'GET' && promptMatch && !promptMatch[1]) {
      sendJson(response, 200, { prompts: await listPrompts() })
      return
    }
    if (request.method === 'POST' && promptMatch && !promptMatch[1]) {
      sendJson(response, 201, { prompt: await createPrompt(await readBody(request)) })
      return
    }
    if (request.method === 'PATCH' && promptMatch?.[1]) {
      const prompt = await updatePrompt(decodeURIComponent(promptMatch[1]), await readBody(request))
      sendJson(response, prompt ? 200 : 404, prompt ? { prompt } : { error: 'prompt_not_found' })
      return
    }
    if (request.method === 'DELETE' && promptMatch?.[1]) {
      const prompt = await deletePrompt(decodeURIComponent(promptMatch[1]))
      sendJson(response, prompt ? 200 : 404, prompt ? { deleted: prompt.id } : { error: 'prompt_not_found' })
      return
    }

    if (request.method === 'GET' && request.url === '/api/results') {
      const results = await readResults()
      if (!validResults(results)) {
        sendJson(response, 500, { error: 'invalid_results_store' })
        return
      }
      sendJson(response, 200, { results })
      return
    }

    if (request.method === 'GET' && request.url === '/api/storage') {
      sendJson(response, 200, { storage: await getStorageStats() })
      return
    }

    if (request.method === 'POST' && request.url === '/api/jobs') {
      const payload = await readBody(request)
      if (typeof payload?.id !== 'string' || (typeof payload?.skillId !== 'string' && typeof payload?.promptId !== 'string') || (payload.skillId && payload.promptId)) {
        sendJson(response, 400, { error: 'job_id_and_source_required' })
        return
      }
      if (payload.promptId && !await getPrompt(payload.promptId)) {
        sendJson(response, 404, { error: 'prompt_not_found' })
        return
      }
      sendJson(response, 201, { job: await createJob(payload) })
      return
    }

    if (request.method === 'GET' && request.url === '/api/jobs') {
      sendJson(response, 200, { jobs: await listJobs() })
      return
    }

    const runMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/run$/)
    if (request.method === 'POST' && runMatch) {
      const job = await startJobRun(decodeURIComponent(runMatch[1]))
      const terminal = job && ['completed', 'cancelled'].includes(job.state)
      sendJson(response, !job ? 404 : terminal ? 409 : 202, !job ? { error: 'job_not_found' } : terminal ? { error: 'job_not_runnable', job } : { job })
      return
    }

    const continueMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/continue$/)
    if (request.method === 'POST' && continueMatch) {
      try {
        const payload = await readBody(request)
        const job = await queueJobContinuation(decodeURIComponent(continueMatch[1]), payload?.payload, payload?.parentArtifactFilename || '')
        sendJson(response, job ? 202 : 404, job ? { job } : { error: 'job_not_found' })
      } catch (error) {
        sendJson(response, error.message === 'job_busy' ? 409 : 400, { error: error.message || 'job_continuation_failed' })
      }
      return
    }

    const cancelMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/cancel$/)
    if (request.method === 'POST' && cancelMatch) {
      const job = await cancelJobRun(decodeURIComponent(cancelMatch[1]))
      sendJson(response, job ? 200 : 404, job ? { job } : { error: 'job_not_found' })
      return
    }

    const outputMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/output\/([^/]+)$/)
    if (request.method === 'GET' && outputMatch) {
      const job = await readJob(decodeURIComponent(outputMatch[1]))
      const filename = decodeURIComponent(outputMatch[2])
      const artifact = job?.artifacts?.find((item) => item.filename === filename)
      if (!artifact || basename(filename) !== filename) {
        sendJson(response, 404, { error: 'artifact_not_found' })
        return
      }
      const paths = getJobPaths(job.id)
      const artifactPath = await safeAssetPath(artifact.path, [getGeneratedDir(), paths.legacyOutputDir])
        || await safeAssetPath(join(paths.generatedDir, artifact.filename), [getGeneratedDir()])
        || await safeAssetPath(join(paths.legacyOutputDir, artifact.filename), [paths.legacyOutputDir])
      if (!artifactPath) {
        sendJson(response, 404, { error: 'artifact_not_found' })
        return
      }
      const data = await readFile(artifactPath)
      response.writeHead(200, { 'content-type': artifact.mime || 'application/octet-stream', 'cache-control': 'no-store' })
      response.end(data)
      return
    }

    const inputFileMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/input\/([^/]+)$/)
    if (request.method === 'GET' && inputFileMatch) {
      const job = await readJob(decodeURIComponent(inputFileMatch[1]))
      const filename = decodeURIComponent(inputFileMatch[2])
      const input = job?.inputs?.find((item) => item.filename === filename)
      if (!input || basename(filename) !== filename) {
        sendJson(response, 404, { error: 'input_not_found' })
        return
      }
      const paths = getJobPaths(job.id)
      const inputPath = await safeAssetPath(input.path, [getUploadsDir(), paths.legacyInputDir])
        || await safeAssetPath(join(paths.inputDir, input.filename), [getUploadsDir()])
        || await safeAssetPath(join(paths.legacyInputDir, input.filename), [paths.legacyInputDir])
      if (!inputPath) {
        sendJson(response, 404, { error: 'input_not_found' })
        return
      }
      const data = await readFile(inputPath)
      response.writeHead(200, { 'content-type': input.mime || 'application/octet-stream', 'cache-control': 'no-store' })
      response.end(data)
      return
    }

    const jobMatch = request.url.match(/^\/api\/jobs\/([^/]+)$/)
    if (request.method === 'GET' && jobMatch) {
      const job = await readJob(decodeURIComponent(jobMatch[1]))
      sendJson(response, job ? 200 : 404, job ? { job } : { error: 'job_not_found' })
      return
    }

    if (request.method === 'PATCH' && jobMatch) {
      const payload = await readBody(request)
      const allowedStates = new Set(['queued', 'running', 'waiting_input', 'completed', 'failed', 'cancelled'])
      if (!allowedStates.has(payload?.state) || typeof payload.message !== 'string' || !validProgress(payload.progress)) {
        sendJson(response, 400, { error: 'invalid_job_state' })
        return
      }
      const job = await updateJob(decodeURIComponent(jobMatch[1]), { state: payload.state, message: payload.message, progress: payload.progress })
      sendJson(response, job ? 200 : 404, job ? { job } : { error: 'job_not_found' })
      return
    }

    const inputMatch = request.url.match(/^\/api\/jobs\/([^/]+)\/input\?(.+)$/)
    if (request.method === 'PUT' && inputMatch) {
      const query = new URLSearchParams(inputMatch[2])
      const filename = query.get('filename') || ''
      const fieldId = query.get('fieldId') || ''
      const turnId = query.get('turnId') || ''
      const mime = request.headers['content-type'] || 'application/octet-stream'
      const buffer = await readBuffer(request)
      if ((!mime.startsWith('image/') && mime !== 'application/octet-stream') || !hasImageSignature(buffer)) {
        sendJson(response, 400, { error: 'image_input_required' })
        return
      }
      const job = await saveJobInput(decodeURIComponent(inputMatch[1]), filename, buffer, mime, fieldId, turnId)
      sendJson(response, job ? 200 : 404, job ? { job } : { error: 'job_not_found' })
      return
    }

    if (request.method === 'PUT' && request.url === '/api/results') {
      const payload = await readBody(request)
      if (!validResults(payload?.results)) {
        sendJson(response, 400, { error: 'invalid_results' })
        return
      }
      const initialized = await initializeResults(payload.results)
      if (initialized === null) {
        sendJson(response, 409, { error: 'results_store_initialized' })
        return
      }
      sendJson(response, 200, { results: initialized })
      return
    }

    if (request.method === 'POST' && request.url === '/api/results') {
      const result = await readBody(request)
      if (!validResult(result)) {
        sendJson(response, 400, { error: 'invalid_result' })
        return
      }
      // Usage belongs to gallery publication; one persistent Job may contain multiple turns.
      const next = await updateResults((results) => {
        return [result, ...results.filter((item) => item.id !== result.id)]
      })
      const usageKey = result.jobId || `result:${result.id}`
      const usageRecord = result.skillId ? await recordSkillPublication(result.skillId, usageKey) : null
      const usageCounted = Boolean(usageRecord?.counted)
      sendJson(response, 201, { result: next[0], usageCounted })
      return
    }

    const resultMatch = request.url.match(/^\/api\/results\/([^/]+)$/)
    if (request.method === 'DELETE' && resultMatch) {
      const resultId = decodeURIComponent(resultMatch[1])
      let found = false
      await updateResults((results) => {
        found = results.some((item) => item.id === resultId)
        return results.filter((item) => item.id !== resultId)
      })
      sendJson(response, found ? 200 : 404, found ? { deleted: resultId } : { error: 'result_not_found' })
      return
    }

    const coverMatch = request.url.match(/^\/api\/results\/([^/]+)\/cover$/)
    if (request.method === 'PATCH' && coverMatch) {
      const payload = await readBody(request)
      if (!COVER_RATIOS.has(payload?.coverRatio) || !validPosition(payload?.coverPosition)) {
        sendJson(response, 400, { error: 'invalid_cover' })
        return
      }
      const resultId = decodeURIComponent(coverMatch[1])
      let updated
      let found = false
      await updateResults((results) => {
        const index = results.findIndex((item) => item.id === resultId)
        if (index < 0) return results
        found = true
        updated = { ...results[index], coverRatio: payload.coverRatio, coverPosition: payload.coverPosition || { x: 50, y: 50 } }
        return results.map((item, itemIndex) => itemIndex === index ? updated : item)
      })
      if (!found) {
        sendJson(response, 404, { error: 'result_not_found' })
        return
      }
      sendJson(response, 200, { result: updated })
      return
    }

    sendJson(response, 404, { error: 'not_found' })
  } catch (error) {
    const status = error.message === 'payload_too_large' ? 413
      : ['skill_already_exists', 'prompt_already_exists'].includes(error.message) ? 409
        : error.message === 'skill_name_not_found' ? 404
          : error.message === 'prompt_not_found' ? 404
            : error.message === 'unsafe_storage_path' || error.message.startsWith('skill_') || error.message.startsWith('prompt_') || error.message.startsWith('only_') || error.message.startsWith('invalid_') || error.message.startsWith('github_') ? 400 : 500
    sendJson(response, status, { error: status === 500 ? 'internal_error' : error.message })
  }
})

await ensureStorageLayout()
await initializeExecutorSelection()
const migration = await migrateLegacyStorage()
if (migration.migratedInputs || migration.migratedArtifacts) console.log(`Style Shelf migrated ${migration.migratedInputs} uploads and ${migration.migratedArtifacts} generated images`)
let bundled = { installed: [], warnings: ['bundled_skill_seed_failed'] }
try {
  bundled = await seedBundledSkills()
} catch (error) {
  // Prompt storage and the local UI must remain available when the optional
  // Codex Skill directory is missing or not writable.
  console.warn(`Style Shelf bundled Skill seed skipped: ${error.message}`)
}
if (bundled.installed.length) console.log(`Style Shelf installed ${bundled.installed.length} bundled Skills`)
for (const warning of bundled.warnings) console.warn(`Style Shelf Skill bundle warning: ${warning}`)
await markInterruptedJobs()
const queuedJobs = (await listJobs()).filter((job) => job.state === 'queued')
await Promise.allSettled(queuedJobs.map((job) => startJobRun(job.id)))

server.listen(port, '127.0.0.1', () => {
  console.log(`Style Shelf mock service listening on http://127.0.0.1:${port}`)
})
