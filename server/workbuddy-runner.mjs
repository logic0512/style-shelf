// WorkBuddy 执行器：通过 WorkBuddy/CodeBuddy 本地 HTTP 服务（codebuddy --serve）执行生图任务。
// 与 codex-runner 保持同一 Job 协议：queued → running → completed/failed/cancelled，
// 产物经 saveJobArtifact 进入 Generated/<job-id>/，图库与封面协议不变。
//
// 生图模型不在 Style Shelf 侧配置：prompt 指示 WorkBuddy 使用其自身配置的
// 图像生成模型（--text-to-image-model / --image-to-image-model 或其配置项），
// 密钥只存在于 WorkBuddy 的配置中，Style Shelf 不读取、不转发、不记录。

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { findSkill } from './codex-runner.mjs'
import { readJob, saveJobArtifact, updateJob } from './jobs.mjs'

const DEFAULT_BASE = 'http://127.0.0.1:8080'
const RUN_REQUEST_TIMEOUT_MS = 30 * 1000
const RUN_TIMEOUT_MS = 15 * 60 * 1000
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'])

// 配置在每次调用时读取（loadLocalEnv 的加载时序由调用方保证），
// 且 token 永远不写入日志、Job 或错误信息。
function getConfig() {
  return {
    base: (process.env.STYLE_SHELF_WORKBUDDY_BASE || DEFAULT_BASE).replace(/\/+$/, ''),
    token: process.env.STYLE_SHELF_WORKBUDDY_TOKEN || '',
  }
}

export function describeWorkBuddyExecutor() {
  const { base, token } = getConfig()
  return {
    id: 'workbuddy',
    label: 'WorkBuddy 执行器',
    state: token ? 'configured' : 'missing_token',
    base,
    imageProvider: {
      id: 'workbuddy-external',
      state: 'external_config_required',
      label: '需在 WorkBuddy 配置生图模型',
      managedBy: 'workbuddy',
    },
  }
}

function authHeaders(config) {
  return {
    'x-codebuddy-request': '1',
    authorization: `Bearer ${config.token}`,
  }
}

function buildPrompt(job, skillPath) {
  const currentTurn = (job.turns || []).find((turn) => turn.id === job.activeTurnId) || job.turns?.at(-1) || null
  const inputFilenames = new Set(currentTurn?.inputFilenames || [])
  const inputs = currentTurn
    ? (inputFilenames.size ? (job.inputs || []).filter((input) => inputFilenames.has(input.filename)) : (job.inputs || []))
    : (job.inputs || [])
  const inputPaths = inputs.map((input) => `- ${input.path}`).join('\n') || '- 无'
  const payload = job.payload || {}
  const fields = payload.fields && typeof payload.fields === 'object' ? payload.fields : {}
  const userText = payload.text || fields.text || fields.direction || ''
  const previousArtifact = currentTurn?.parentArtifactFilename
    ? (job.artifacts || []).find((artifact) => artifact.filename === currentTurn.parentArtifactFilename)
    : null
  const turnLabel = currentTurn ? `第 ${currentTurn.index} 轮` : '第 1 轮'
  return [
    `你正在通过 WorkBuddy 执行 Style Shelf 的图像任务 ${job.id}（${turnLabel}）。`,
    '',
    `1. 读取并严格遵循这个 Skill 的规则：${skillPath}`,
    '2. 用户提供的输入图片（只能使用这些作为图像来源）：',
    inputPaths,
    `3. 需要在此基础上修改的上一轮结果（如有）：${previousArtifact?.path || '无'}`,
    `4. 用户要求：${userText || '无'}`,
    `5. 结构化输入：${JSON.stringify(fields)}`,
    `6. 用户答复：${JSON.stringify(payload.answers || {})}`,
    `7. 把生成的结果图片保存到这个目录（如 result.png，多图用 result-1.png、result-2.png）：${job.outputDir}`,
    '',
    '要求：',
    '- 使用你在 WorkBuddy 中配置的图像生成模型完成生图（文生图或图生图，按 Skill 要求）；不要调用未配置的内置默认生图工具。',
    '- 只在输出目录中创建新文件；不删除、不覆盖、不移动任何其他文件。',
    '- 不要在回复中输出任何 API Key、Cookie 或认证信息。',
    '- 直接产出图片文件，不要只返回计划或文字描述。',
    '- 如果图像生成模型未配置或调用失败，明确说明具体错误原因，不要编造结果。',
  ].join('\n')
}

async function postRun(prompt, config) {
  const id = `styleshelf-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const body = {
    id,
    type: 'message',
    source: {
      platform: 'generic',
      sender: { id: 'style-shelf', name: 'Style Shelf' },
      conversation: { id, type: 'direct' },
    },
    payload: { text: prompt },
  }
  let response
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RUN_REQUEST_TIMEOUT_MS)
  try {
    response = await fetch(`${config.base}/api/v1/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(config) },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    throw new Error(error?.name === 'AbortError' ? 'workbuddy_run_timeout' : 'workbuddy_unreachable')
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (response.status === 401) throw new Error('workbuddy_auth_failed')
    throw new Error(`workbuddy_run_rejected_${response.status}${text ? `:${text.slice(0, 120)}` : ''}`)
  }
  const payload = await response.json().catch(() => null)
  const runId = payload?.data?.runId
  if (!runId) throw new Error('workbuddy_run_not_accepted')
  return runId
}

// 消费 SSE 流直到 run 完成/失败/流结束/被取消/超时。
// 返回 { status: 'completed'|'failed', detail } —— detail 是最终文本摘要（截断保存）。
function consumeRunStream(runId, config, control, onProgress) {
  return new Promise((resolvePromise) => {
    const controller = new AbortController()
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise(result)
    }
    const timer = setTimeout(() => {
      controller.abort()
      finish({ status: 'failed', detail: 'workbuddy_turn_timeout' })
    }, RUN_TIMEOUT_MS)
    control.abort = () => {
      controller.abort()
      finish({ status: 'failed', detail: 'job_cancelled' })
    }

    fetch(`${config.base}/api/v1/runs/${runId}/stream`, {
      headers: { ...authHeaders(config), accept: 'text/event-stream' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok || !response.body) {
        finish({ status: 'failed', detail: `workbuddy_stream_${response.status}` })
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalStatus = ''
      let finalDetail = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const chunk of events) {
          const dataLines = chunk.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim())
          if (!dataLines.length) continue
          let event
          try { event = JSON.parse(dataLines.join('\n')) } catch { continue }
          if (event?.status === 'completed' || event?.status === 'failed' || event?.status === 'error') {
            finalStatus = event.status === 'completed' ? 'completed' : 'failed'
            finalDetail = String(event?.content?.markdown || event?.content?.text || event?.error || '').slice(0, 500)
          } else if (event?.status && typeof event.status === 'string') {
            onProgress(`WorkBuddy 任务进行中（${event.status}）`)
          }
        }
      }
      finish(finalStatus
        ? { status: finalStatus, detail: finalDetail }
        : { status: 'failed', detail: 'workbuddy_stream_ended_without_result' })
    }).catch((error) => {
      if (settled) return
      finish({ status: 'failed', detail: error?.name === 'AbortError' ? 'job_cancelled' : 'workbuddy_stream_error' })
    })
  })
}

async function cancelRemoteRun(runId, config) {
  if (!runId) return
  try {
    await fetch(`${config.base}/api/v1/runs/${runId}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(config) },
      body: '{}',
    })
  } catch {}
}

// 回收本轮产物：只接纳 run 启动后 outputDir 中新增的图片文件，
// 逐个交给 saveJobArtifact（路径白名单与图片签名校验由它负责）。
async function collectArtifacts(jobId, outputDir, knownFiles, activeTurnId) {
  let entries = []
  try {
    entries = await readdir(outputDir, { withFileTypes: true })
  } catch {
    return []
  }
  const collected = []
  for (const entry of entries) {
    if (!entry.isFile() || knownFiles.has(entry.name)) continue
    if (!IMAGE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase())) continue
    const sourcePath = join(outputDir, entry.name)
    const updated = await saveJobArtifact(jobId, sourcePath, 'image/png', activeTurnId)
    if (updated?.artifacts?.length) collected.push(updated.artifacts.at(-1).filename)
  }
  return collected
}

export async function runWorkBuddyJob(job, onProgress = () => {}, control = {}) {
  if (control.cancelled) throw new Error('job_cancelled')
  const config = getConfig()
  if (!config.token) throw new Error('workbuddy_token_missing')
  const skillPath = await findSkill(job.skillId)
  if (control.cancelled) throw new Error('job_cancelled')

  let knownFiles = new Set()
  try {
    knownFiles = new Set((await readdir(job.outputDir, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name))
  } catch {}

  const runId = await postRun(buildPrompt(job, skillPath), config)
  control.remoteRunId = runId
  onProgress(`WorkBuddy Run ${runId} 已启动`)
  if (control.cancelled) {
    await cancelRemoteRun(runId, config)
    throw new Error('job_cancelled')
  }

  const outcome = await consumeRunStream(runId, config, control, onProgress)
  if (control.cancelled) {
    await cancelRemoteRun(runId, config)
    throw new Error('job_cancelled')
  }
  if (outcome.status !== 'completed') throw new Error(outcome.detail || 'workbuddy_run_failed')

  const activeTurnId = job.activeTurnId || job.turns?.at(-1)?.id || ''
  const artifactFilenames = await collectArtifacts(job.id, job.outputDir, knownFiles, activeTurnId)
  if (!artifactFilenames.length) throw new Error('workbuddy_no_image_artifact')
  return { runId, skillPath, artifactFilenames }
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
    remoteRunId: null,
    cancel() {
      this.cancelled = true
      this.abort?.()
    },
  }
  const entry = { promise: null, cancel: () => control.cancel(), getRemoteRunId: () => control.remoteRunId }
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
      await updateJob(jobId, { state: 'running', progress: 10, message: '正在启动 WorkBuddy 执行器' })
      const run = (async () => {
        try {
          const result = await runWorkBuddyJob(job, (message) => updateJob(jobId, { state: 'running', progress: 48, message }).catch(() => {}), control)
          if (control.cancelled) throw new Error('job_cancelled')
          const current = await readJob(jobId)
          const activeTurnId = current?.activeTurnId || current?.turns?.at(-1)?.id || ''
          const turns = (current.turns || []).map((turn) => turn.id === activeTurnId
            ? { ...turn, state: 'completed', workbuddyRunId: result.runId, artifactFilenames: result.artifactFilenames, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : turn)
          await updateJob(jobId, {
            state: 'completed',
            progress: 100,
            message: `WorkBuddy 已完成第 ${current?.turns?.find((turn) => turn.id === activeTurnId)?.index || 1} 轮，结果图片已接纳到本地 Job`,
            turns,
            activeTurnId: null,
            lastTurnId: activeTurnId || null,
            runner: { executor: 'workbuddy', runId: result.runId, skillPath: result.skillPath },
          })
          if (control.cancelled) {
            await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' })
            throw new Error('job_cancelled')
          }
        } catch (error) {
          const cancelled = error.message === 'job_cancelled'
          if (!cancelled && control.remoteRunId) await cancelRemoteRun(control.remoteRunId, getConfig())
          const failedJob = await readJob(jobId).catch(() => null)
          const failedTurnId = failedJob?.activeTurnId || failedJob?.turns?.at(-1)?.id || ''
          const turns = (failedJob?.turns || []).map((turn) => turn.id === failedTurnId
            ? { ...turn, state: cancelled ? 'cancelled' : 'failed', error: error.message || 'WorkBuddy 执行失败', updatedAt: new Date().toISOString() }
            : turn)
          await updateJob(jobId, { state: cancelled ? 'cancelled' : 'failed', progress: 0, message: cancelled ? '任务已取消' : error.message || 'WorkBuddy 执行失败', turns }).catch(() => {})
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
    const remoteRunId = active.getRemoteRunId?.()
    if (remoteRunId) await cancelRemoteRun(remoteRunId, getConfig())
    active.cancel()
    await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' }).catch(() => {})
  } else {
    await updateJob(jobId, { state: 'cancelled', progress: 0, message: '任务已取消' })
  }
  return readJob(jobId)
}
