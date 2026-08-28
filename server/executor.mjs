// 执行器选择器：Style Shelf 的 Job 执行层可以切换。
// - codex（默认）：本地 Codex Runner，由 Codex 内置图像能力生图。
// - workbuddy：通过 WorkBuddy 本地 HTTP 服务执行，生图使用 WorkBuddy 侧配置的图像模型。
//
// 切换方式：环境变量 STYLE_SHELF_EXECUTOR=workbuddy（可写入 .env）。
// 两个执行器共用同一 Job / Turn / 产物 / 图库协议，前端无感知。

import * as codexRunner from './codex-runner.mjs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from './storage.mjs'
import { readJob, updateJob } from './jobs.mjs'
import { cancelJobRun as cancelWorkBuddyRun, describeWorkBuddyExecutor, startJobRun as startWorkBuddyRun } from './workbuddy-runner.mjs'

const selectionFile = join(getDataDir(), 'executor.json')
let selectedExecutor = null

export function getExecutorId() {
  if (selectedExecutor) return selectedExecutor
  return (process.env.STYLE_SHELF_EXECUTOR || 'codex').trim().toLowerCase() === 'workbuddy' ? 'workbuddy' : 'codex'
}

export async function initializeExecutorSelection() {
  try {
    const payload = JSON.parse(await readFile(selectionFile, 'utf8'))
    if (payload?.id === 'codex' || payload?.id === 'workbuddy') selectedExecutor = payload.id
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`Style Shelf executor preference ignored: ${error.message}`)
  }
  return getExecutorId()
}

export async function configureExecutor(id) {
  if (id !== 'codex' && id !== 'workbuddy') throw new Error('invalid_executor')
  await mkdir(getDataDir(), { recursive: true })
  await writeFile(selectionFile, `${JSON.stringify({ id }, null, 2)}\n`, 'utf8')
  selectedExecutor = id
  return describeExecutor()
}

export function describeExecutor() {
  if (getExecutorId() === 'workbuddy') return describeWorkBuddyExecutor()
  return {
    id: 'codex-runner',
    label: '本地 Codex Runner',
    state: 'configured',
    imageProvider: { id: 'codex-managed', state: 'codex_managed', label: '由 Codex 提供' },
  }
}

export async function startJobRun(jobId) {
  const job = await readJob(jobId)
  if (!job) return null
  const executorId = job.promptId ? 'codex' : (['queued', 'failed', 'waiting_input'].includes(job.state) ? getExecutorId() : job.runner?.executor || getExecutorId())
  if (job.runner?.executor !== executorId && ['queued', 'failed', 'waiting_input'].includes(job.state)) {
    await updateJob(jobId, { runner: { ...(job.runner || {}), executor: executorId } })
  }
  return executorId === 'workbuddy' ? startWorkBuddyRun(jobId) : codexRunner.startJobRun(jobId)
}

export async function cancelJobRun(jobId) {
  const job = await readJob(jobId)
  const executorId = job?.runner?.executor || getExecutorId()
  return executorId === 'workbuddy' ? cancelWorkBuddyRun(jobId) : codexRunner.cancelJobRun(jobId)
}
