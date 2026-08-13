import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { readJob, saveJobArtifact, updateJob } from './jobs.mjs'

const RUNTIME_CANDIDATES = [
  process.env.CODEX_BIN,
  '/Applications/ChatGPT.app/Contents/Resources/codex',
  '/Applications/Codex.app/Contents/Resources/codex',
].filter(Boolean)

const SKILL_ALIASES = {
  'photo-abstract-editorial': ['photo-abstract-editorial'],
  'gc-minimal-zine-poster-v0-1': ['minimal-zine-poster-v01', 'gc-minimal-zine-poster-v0-1'],
  'scene-distillation-zine-v1-3': ['scene-distillation-zine-v1-3'],
  'scenes-gathered-zine-v1-3': ['scenes-gathered-zine-v1-3'],
}

async function findRuntime() {
  for (const candidate of RUNTIME_CANDIDATES) {
    try { await access(candidate, constants.X_OK); return candidate } catch {}
  }
  return 'codex'
}

export async function findSkill(skillId) {
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex')
  const roots = [process.env.CODEX_SKILLS_ROOT, join(codexHome, 'skills')].filter(Boolean)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,119}$/.test(skillId)) throw new Error(`skill_not_registered:${skillId}`)
  const aliases = SKILL_ALIASES[skillId] || [skillId]
  for (const alias of aliases) {
    for (const root of roots) {
      const candidate = join(root, alias, 'SKILL.md')
      try { await access(candidate, constants.R_OK); return candidate } catch {}
    }
  }
  throw new Error(`skill_not_found:${skillId}`)
}

class JsonRpcClient {
  constructor(child, onNotification) {
    this.child = child
    this.nextId = 1
    this.pending = new Map()
    this.onNotification = onNotification
    this.lines = createInterface({ input: child.stdout })
    this.lines.on('line', (line) => this.handleLine(line))
    child.on('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('codex_runtime_closed'))
      this.pending.clear()
    })
  }

  handleLine(line) {
    let message
    try { message = JSON.parse(line) } catch { return }
    if (message.id != null && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id)
      this.pending.delete(message.id)
      message.error ? pending.reject(new Error(message.error.message || 'codex_rpc_error')) : pending.resolve(message.result)
      return
    }
    if (message.id != null && message.method) {
      this.handleServerRequest(message)
      return
    }
    if (message.method) this.onNotification(message.method, message.params || {})
  }

  handleServerRequest(message) {
    let result = {}
    if (message.method === 'item/commandExecution/requestApproval' || message.method === 'item/fileChange/requestApproval' || message.method === 'item/permissions/requestApproval') {
      result = { decision: 'decline' }
    } else if (message.method === 'item/tool/requestUserInput') {
      result = { answers: [] }
    }
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n`)
  }

  request(method, params) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) })}\n`)
  }

  close() {
    this.lines.close()
    this.child.kill('SIGTERM')
  }
}

function buildPrompt(job, skillPath) {
  const currentTurn = (job.turns || []).find((turn) => turn.id === job.activeTurnId) || job.turns?.at(-1) || null
  const inputFilenames = new Set(currentTurn?.inputFilenames || [])
  const inputs = currentTurn?.index > 1
    ? (job.inputs || []).filter((input) => inputFilenames.has(input.filename))
    : currentTurn
      ? (inputFilenames.size ? (job.inputs || []).filter((input) => inputFilenames.has(input.filename)) : (job.inputs || []))
      : (job.inputs || [])
  const inputPaths = inputs.map((input) => `- ${input.path}`).join('\n') || '- none'
  const payload = job.payload || {}
  const fields = payload.fields && typeof payload.fields === 'object' ? payload.fields : {}
  const userText = payload.text || fields.text || fields.direction || 'none'
  const previousArtifact = currentTurn?.parentArtifactFilename
    ? (job.artifacts || []).find((artifact) => artifact.filename === currentTurn.parentArtifactFilename)
    : null
  const turnLabel = currentTurn ? `Turn ${currentTurn.index}` : '初始任务'
  return [
    `You are executing Style Shelf Job ${job.id}.`,
    `This is ${turnLabel} in a persistent image-creation session.`,
    `Read and follow this Skill exactly: ${skillPath}`,
    'Local input files (use these as the only user-provided image sources):',
    inputPaths,
    `Previous generated result to refine (if present): ${previousArtifact?.path || 'none'}`,
    `User direction: ${userText}`,
    `All structured user inputs: ${JSON.stringify(fields)}`,
    `User answers: ${JSON.stringify(payload.answers || {})}`,
    `Requested output directory: ${job.outputDir}`,
    'Complete the image task. Use built-in image generation when the Skill requires it. Do not return a plan instead of the image.',
  ].join('\n')
}

export async function runCodexJob(job, onProgress = () => {}, control = {}) {
  if (control.cancelled) throw new Error('job_cancelled')
  const runtime = await findRuntime()
  if (control.cancelled) throw new Error('job_cancelled')
  const skillPath = await findSkill(job.skillId)
  if (control.cancelled) throw new Error('job_cancelled')
  const child = spawn(runtime, ['app-server', '--listen', 'stdio://'], {
    cwd: dirname(job.outputDir),
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let completed = false
  let turnStarted = false
  let cancelled = false
  const savedPaths = new Set()
  let finish
  let fail
  let client
  const turnDone = new Promise((resolve, reject) => { finish = resolve; fail = reject })
  turnDone.catch(() => {})
  control.abort = () => {
    if (!cancelled) {
      cancelled = true
      if (!completed) fail(new Error('job_cancelled'))
    }
    client?.close()
  }
  client = new JsonRpcClient(child, (method, params) => {
    if (method === 'item/started') onProgress('Codex 已开始处理任务')
    if (method === 'item/completed') {
      const item = params.item || {}
      if (item.type === 'imageGeneration') {
        const savedPath = item.savedPath || item.saved_path
        if (savedPath) savedPaths.add(savedPath)
        onProgress('Codex 已完成一张图片')
      }
    }
    if (method === 'turn/completed') {
      completed = true
      finish({ savedPaths: [...savedPaths], turn: params.turn })
    }
  })
  if (control.cancelled) control.abort()
  child.stderr.on('data', () => {})
  child.on('error', fail)
  child.on('close', () => { if (!completed && !cancelled) fail(new Error('codex_runtime_closed')) })
  const timeout = setTimeout(() => fail(new Error('codex_turn_timeout')), 15 * 60 * 1000)
  try {
    await client.request('initialize', { clientInfo: { name: 'style-shelf', version: '0.1.0' }, capabilities: { experimentalApi: true } })
    client.notify('initialized')
    const existingThreadId = job.runner?.threadId
    const thread = existingThreadId
      ? await client.request('thread/resume', { threadId: existingThreadId, personality: 'pragmatic' })
      : await client.request('thread/start', {
        cwd: dirname(job.outputDir),
        sandbox: 'read-only',
        approvalPolicy: 'never',
        ephemeral: false,
        personality: 'pragmatic',
      })
    const turn = await client.request('turn/start', {
      threadId: thread.thread.id,
      input: [{ type: 'text', text: buildPrompt(job, skillPath) }],
      summary: 'concise',
    })
    turnStarted = true
    onProgress(`Codex Thread ${thread.thread.id} 已启动，Turn ${turn.turn.id} 运行中`)
    const result = await turnDone
    if (!completed) throw new Error('codex_turn_incomplete')
    if (result.turn?.status && result.turn.status !== 'completed') throw new Error(`codex_turn_${result.turn.status}`)
    return { runtime, skillPath, threadId: thread.thread.id, turnId: turn.turn.id, resumed: Boolean(existingThreadId), savedPaths: result.savedPaths }
  } catch (error) {
    if (control.cancelled) throw new Error('job_cancelled')
    throw error
  } finally {
    clearTimeout(timeout)
    client.close()
  }
}

const activeRuns = new Map()
const startLocks = new Map()
const MAX_CONCURRENT_RUNS = 5
const waitingQueue = new Set()

function pumpQueue() {
  if (activeRuns.size >= MAX_CONCURRENT_RUNS) return
  for (const jobId of waitingQueue) {
    if (activeRuns.size >= MAX_CONCURRENT_RUNS) break
    waitingQueue.delete(jobId)
    startJobRun(jobId).catch(() => {})
  }
}

export async function startJobRun(jobId) {
  if (activeRuns.has(jobId)) return readJob(jobId)
  if (startLocks.has(jobId)) {
    await startLocks.get(jobId)
    return readJob(jobId)
  }
  if (activeRuns.size >= MAX_CONCURRENT_RUNS) {
    waitingQueue.add(jobId)
    return readJob(jobId)
  }
  let release
  const lock = new Promise((resolve) => { release = resolve })
  startLocks.set(jobId, lock)
  const control = {
    cancelled: false,
    abort: null,
    cancel() {
      this.cancelled = true
      this.abort?.()
    },
  }
  const entry = { promise: null, cancel: () => control.cancel() }
  // 同步段占位：确保检查与占位之间不会被其他并发调用插入，保证并发数不超上限。
  activeRuns.set(jobId, entry)
  try {
    const job = await readJob(jobId)
    if (!job || !['queued', 'failed', 'waiting_input'].includes(job.state)) {
      activeRuns.delete(jobId)
      pumpQueue()
      return job
    }
    try {
      await updateJob(jobId, { state: 'running', progress: 10, message: '正在启动 Codex Runner' })
      const run = (async () => {
        try {
          const result = await runCodexJob(job, (message) => updateJob(jobId, { state: 'running', progress: 48, message }).catch(() => {}), control)
          if (control.cancelled) throw new Error('job_cancelled')
          let current = await readJob(jobId)
          const activeTurnId = current?.activeTurnId || current?.turns?.at(-1)?.id || ''
          const artifactFilenames = []
          for (const savedPath of result.savedPaths) {
            current = await saveJobArtifact(jobId, savedPath, 'image/png', activeTurnId)
            if (current?.artifacts?.length) artifactFilenames.push(current.artifacts.at(-1).filename)
            if (control.cancelled) throw new Error('job_cancelled')
          }
          if (!artifactFilenames.length) throw new Error('codex_no_image_artifact')
          if (control.cancelled) throw new Error('job_cancelled')
          const turns = (current.turns || []).map((turn) => turn.id === activeTurnId
            ? { ...turn, state: 'completed', codexTurnId: result.turnId, artifactFilenames, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : turn)
          await updateJob(jobId, {
            state: 'completed',
            progress: 100,
            message: `Codex 已完成第 ${current.turns?.find((turn) => turn.id === activeTurnId)?.index || 1} 轮，结果图片已接纳到本地 Job`,
            turns,
            activeTurnId: null,
            lastTurnId: activeTurnId || null,
            runner: { executor: 'codex', runtime: result.runtime, skillPath: result.skillPath, threadId: result.threadId, turnId: result.turnId },
          })
          if (control.cancelled) {
            await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' })
            throw new Error('job_cancelled')
          }
        } catch (error) {
          const cancelled = error.message === 'job_cancelled'
          const failedJob = await readJob(jobId).catch(() => null)
          const failedTurnId = failedJob?.activeTurnId || failedJob?.turns?.at(-1)?.id || ''
          const turns = (failedJob?.turns || []).map((turn) => turn.id === failedTurnId
            ? { ...turn, state: cancelled ? 'cancelled' : 'failed', error: error.message || 'Codex Runner 执行失败', updatedAt: new Date().toISOString() }
            : turn)
          await updateJob(jobId, { state: cancelled ? 'cancelled' : 'failed', progress: 0, message: cancelled ? '任务已取消' : error.message || 'Codex Runner 执行失败', turns }).catch(() => {})
        } finally {
          activeRuns.delete(jobId)
          pumpQueue()
        }
      })()
      entry.promise = run
      return readJob(jobId)
    } catch (error) {
      activeRuns.delete(jobId)
      pumpQueue()
      throw error
    }
  } finally {
    startLocks.delete(jobId)
    release()
  }
}

export async function cancelJobRun(jobId) {
  if (startLocks.has(jobId)) await startLocks.get(jobId)
  waitingQueue.delete(jobId)
  const job = await readJob(jobId)
  if (!job || ['completed', 'failed', 'cancelled'].includes(job.state)) return job
  const active = activeRuns.get(jobId)
  if (active) {
    active.cancel()
    await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' }).catch(() => {})
  } else {
    await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' })
  }
  return readJob(jobId)
}
