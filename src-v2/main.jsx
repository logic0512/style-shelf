import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { cancelJob, configureExecutor, continueJob, createJob, createPrompt, deletePrompt, deleteResult, deleteSkill, installSkill, jobArtifactUrl, jobInputUrl, loadDeletedSkills, loadHealth, loadJob, loadJobs, loadLocalSkills, loadPersistedResults, loadPromptCatalog, loadSkillCatalog, loadStorage, restoreSkill, runJob, saveResult, seedResults, updateJob, updatePrompt, uploadJobInput, updateSkill } from './api.js'
import './styles.css'

/* ---------------- 数据 ---------------- */

const SKILLS = []

const GUIDED_QUESTIONS = [
  { id: 'q1', label: 'Q1 · 主体', question: '画面的主体是什么？', options: ['人物', '静物', '空间', '混合元素'] },
  { id: 'q2', label: 'Q2 · 空间', question: '希望什么样的空间感？', options: ['室内一角', '城市街景', '自然风景', '抽象空间'] },
  { id: 'q3', label: 'Q3 · 情绪', question: '画面的情绪基调？', options: ['安静', '热烈', '怀旧', '紧张'] },
]

const SEED_RESULTS = []

const TASK_STATE_LABEL = {
  queued: '排队中',
  running: '运行中',
  waiting_input: '等待回答',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

function formatSkillVersion(version) {
  return version === 'local' ? '本地' : (version ? `v${version}` : '')
}

function formatLocalResultDate(value, fallback = '历史任务') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (number) => String(number).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const now = new Date()
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
    return `今天 ${time}`
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
}

function findSource(value, skills, prompts) {
  if (value?.promptId) return prompts.find((item) => item.id === value.promptId) || null
  return skills.find((item) => item.id === value?.skillId) || null
}

function matchesSource(value, item) {
  return item?.kind === 'prompt' ? value?.promptId === item.id : value?.skillId === item?.id
}

/* ---------------- 卡片视觉：四种独立身份 ---------------- */

function CardVisual({ skill, size = 'card' }) {
  const cls = size === 'preview' ? 'visual preview' : 'visual'
  if (skill.cover) {
    return (
      <div className={`${cls} visual-photo`}>
        <img src={skill.cover} alt={`${skill.name} 示例`} style={{ objectPosition: `${skill.coverPosition?.x ?? 50}% ${skill.coverPosition?.y ?? 50}%` }} />
        <span className="photo-caption">SAMPLE 01 · {skill.kind === 'prompt' ? 'Prompt 产出' : 'Skill 产出'}</span>
      </div>
    )
  }
  return (
    <div className={`${cls} visual-placeholder visual-needs-sample`}>
      <span className="placeholder-index">{skill.index}</span>
      <strong>尚无真实样例</strong>
      <span>先运行一次这个{skill.kind === 'prompt' ? ' Prompt' : ' Skill'}</span>
      <small>生成后自动填充封面</small>
    </div>
  )
}

function StudioDescription({ skill }) {
  if (skill.kind === 'prompt') return <p>{skill.summary || '按这个 Prompt 固定风格规则生成。'}</p>
  if (skill.id !== 'photo-abstract-editorial') return <p>{skill.desc}</p>
  return (
    <div className="studio-description">
      <p>保留用户照片作为主体，并从照片的空间、色调和构图关系中重建一个克制的抽象记忆面板，形成竖版社论式双联画。适合风景、建筑、人物和空间关系清楚的摄影素材；它不是滤镜，也不会把原图完全重绘。</p>
      <div className="studio-attributes" aria-label="Skill 属性">
        <span className="skill-tag">图片转绘</span>
        <span className="skill-tag">竖版 · 建议 3:5</span>
      </div>
    </div>
  )
}

function SkillSource({ skill, compact = false }) {
  if (!skill.sourceUrl) return null
  return (
    <div className={compact ? 'skill-source skill-source-compact' : 'skill-source'}>
      <span>{compact ? skill.author : `原作者：${skill.author || '查看来源'}`}</span>
      {!compact && skill.license && <span>许可：{skill.license}</span>}
      <a href={skill.sourceUrl} target="_blank" rel="noreferrer">{compact ? `作者：${skill.author || '查看来源'} ↗` : '原始来源 ↗'}</a>
    </div>
  )
}

/* ---------------- 主框架 ---------------- */

function App() {
  const [view, setView] = useState('shelf')
  const [skills, setSkills] = useState(SKILLS)
  const [skillsReady, setSkillsReady] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [promptsReady, setPromptsReady] = useState(false)
  const [activeStyle, setActiveStyle] = useState(null)
  const [tasks, setTasks] = useState([])
  const [results, setResults] = useState(SEED_RESULTS)
  const [studioResult, setStudioResult] = useState(null)
  const [studioDraftTaskId, setStudioDraftTaskId] = useState(null)
  const [storageState, setStorageState] = useState('checking')
  const [saveError, setSaveError] = useState('')
  const [workshopOpen, setWorkshopOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [coverEditSkill, setCoverEditSkill] = useState(null)
  const [promptEditor, setPromptEditor] = useState(null)
  const [coverEditError, setCoverEditError] = useState('')
  const [viewingResult, setViewingResult] = useState(null)
  const [studioPrefill, setStudioPrefill] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const taskActionLocksRef = useRef(new Set())
  const activeStyleIdRef = useRef(null)
  const studioDraftTaskIdRef = useRef(null)
  activeStyleIdRef.current = activeStyle?.id || null
  studioDraftTaskIdRef.current = studioDraftTaskId

  useEffect(() => {
    let cancelled = false
    loadSkillCatalog().then((catalog) => {
      if (!cancelled && catalog.length) {
        // API catalog is authoritative. Merging into the static fallback would
        // resurrect Skills that were already removed from this workspace.
        setSkills(catalog)
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setSkillsReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadPromptCatalog().then((catalog) => {
      if (!cancelled) setPrompts(catalog)
    }).catch(() => {}).finally(() => {
      if (!cancelled) setPromptsReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!skillsReady || !promptsReady) return undefined
    let cancelled = false
    loadPersistedResults().then((persisted) => {
      if (cancelled) return
      if (persisted.length) {
        const namesById = new Map([...skills, ...prompts].map((style) => [style.id, style.name]))
        setResults(persisted.map((result) => (result.skillId || result.promptId) && namesById.has(result.skillId || result.promptId)
          ? { ...result, styleName: namesById.get(result.skillId || result.promptId) }
          : result))
        setStorageState('ready')
      } else {
        seedResults(SEED_RESULTS).then(() => setStorageState('ready')).catch(() => setStorageState('offline'))
      }
    }).catch(() => setStorageState('offline'))
    loadJobs().then(async (jobs) => {
      if (cancelled) return
      const restoredTasks = await Promise.all(jobs.map(async (job) => {
        const style = findSource(job, skills, prompts)
        const resultVersions = style ? await buildJobResults(job, style) : []
        return {
        id: job.id,
        skillId: job.skillId,
        promptId: job.promptId,
        name: style?.name || job.skillId || job.promptId,
        theme: style?.theme || 'photo',
        kind: style?.kind || (job.promptId ? 'prompt' : 'skill'),
        state: job.state,
        progress: Number.isFinite(job.progress) ? job.progress : 0,
        message: job.message || '已恢复本地任务记录',
        payload: job.payload || {},
        resultVersions,
        result: resultVersions.at(-1) || null,
      }
      }))
      setTasks((current) => {
        const currentIds = new Set(current.map((task) => task.id))
        return [...current, ...restoredTasks.filter((task) => !currentIds.has(task.id))]
      })
      jobs.filter((job) => job.state === 'queued').forEach((job) => {
        const style = findSource(job, skills, prompts)
        if (!style) return
        runJob(job.id).then(() => monitorJob(job.id, style, job.payload || {})).catch(() => {})
      })
      jobs.filter((job) => job.state === 'running').forEach((job) => {
        const style = findSource(job, skills, prompts)
        if (style) monitorJob(job.id, style, job.payload || {})
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [skillsReady, promptsReady]) // 只在启动时恢复一次，目录刷新不得重复监听同一 Job

  const visibleSkills = skills

  async function refreshSkills() {
    const catalog = await loadSkillCatalog()
    setSkills(catalog)
  }

  async function refreshPrompts() {
    const catalog = await loadPromptCatalog()
    setPrompts(catalog)
  }

  function openPromptEditor(prompt = null) {
    setPromptEditor(prompt || { name: '', summary: '', mode: 'image', template: '' })
  }

  async function savePromptForm(input) {
    const response = promptEditor?.id
      ? await updatePrompt(promptEditor.id, input)
      : await createPrompt(input)
    const saved = response.prompt
    if (saved) setPrompts((current) => promptEditor?.id
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [...current, saved])
    setPromptEditor(null)
  }

  function removePromptFromShelf(prompt) {
    setConfirmState({
      title: '删除 Prompt',
      message: `删除「${prompt.name}」？历史任务和图库结果不会被删除。`,
      confirmLabel: '删除 Prompt',
      onConfirm: async () => {
        setConfirmState(null)
        try {
          await deletePrompt(prompt.id)
          setPrompts((current) => current.filter((item) => item.id !== prompt.id))
        } catch {
          window.alert('删除失败，请确认本地服务仍在运行。')
        }
      },
    })
  }

  async function reorderSkills(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return
    const current = skills
    const sourceIndex = current.findIndex((skill) => skill.id === sourceId)
    const targetIndex = current.findIndex((skill) => skill.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const next = [...current]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved)
    setSkills(next)
    try {
      await Promise.all(next.map((skill, index) => updateSkill(skill.id, { order: index })))
    } catch {
      try { setSkills(await loadSkillCatalog()) } catch {}
      window.alert('风格顺序保存失败，请确认本地服务仍在运行。')
    }
  }

  function discardStudioDraft() {
    setStudioResult(null)
    setStudioDraftTaskId(null)
    setSaveError('')
    setStudioPrefill(null)
  }

  function confirmLeaveStudio() {
    // Results belong to the persistent Job as soon as Codex finishes; leaving
    // the page only changes the current view and never discards a Job version.
    return true
  }

  function navigateAway(nextView) {
    if (!confirmLeaveStudio()) return
    discardStudioDraft()
    setActiveStyle(null)
    if (nextView) setView(nextView)
  }

  function openSkill(skill, prefill = null) {
    if (!confirmLeaveStudio()) return
    if (skill.installed === false) {
      setWorkshopOpen(true)
      return
    }
    discardStudioDraft()
    setActiveStyle(skill)
    setStudioPrefill(prefill)
  }

  function closeStudio() { navigateAway() }

  function beginNewStudioTask() {
    setStudioResult(null)
    setStudioDraftTaskId(null)
    setStudioPrefill(null)
    setSaveError('')
  }

  function buildStudioResult(skill, payload, artifact, outputRatio = null) {
    const { filesByField, file, ...savedPayload } = payload
    const sourceRatio = outputRatio || payload.ratio || '待读取'
    const fileInputs = payload.fileInputs || (payload.fileName ? [{ fieldId: 'source_images', filename: payload.fileName }] : [])
    const sourceInputs = artifact
      ? (Array.isArray(payload.sourceInputs)
        ? payload.sourceInputs
        : fileInputs.map((input) => ({ jobId: artifact.jobId, ...input })))
      : []
    return {
      id: `r-${Date.now()}`,
      jobId: artifact?.jobId || null,
      ...(skill.kind === 'prompt' ? { promptId: skill.id } : { skillId: skill.id }),
      title: payload.text || payload.fields?.direction || payload.fileName || '未命名结果',
      styleName: skill.name,
      theme: skill.theme,
      date: '刚刚',
      createdAt: new Date().toISOString(),
      image: artifact ? jobArtifactUrl(artifact.jobId, artifact.filename) : skill.samples?.[1] || skill.samples?.[0] || null,
      artifact: artifact || null,
      coverRatio: outputRatio?.includes(':')
        ? (Number(outputRatio.split(':')[0]) >= Number(outputRatio.split(':')[1]) ? '4:3' : '3:4')
        : (payload.ratio === '16:9' ? '4:3' : '3:4'),
      coverPosition: { x: 50, y: 50 },
      originalRatio: sourceRatio,
      payload: savedPayload,
      sourceInput: sourceInputs[0] || null,
      sourceInputs,
    }
  }

  function detectImageRatio(url) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      const timeout = window.setTimeout(() => reject(new Error('image_dimensions_timeout')), 5000)
      image.onload = () => {
        window.clearTimeout(timeout)
        if (!image.naturalWidth || !image.naturalHeight) { reject(new Error('image_dimensions_unavailable')); return }
        const greatest = (a, b) => b ? greatest(b, a % b) : a
        const divisor = greatest(image.naturalWidth, image.naturalHeight)
        resolve(`${image.naturalWidth / divisor}:${image.naturalHeight / divisor}`)
      }
      image.onerror = () => { window.clearTimeout(timeout); reject(new Error('image_dimensions_unavailable')) }
      image.src = url
    })
  }

  async function buildJobResults(job, skill) {
    const turns = Array.isArray(job.turns) ? job.turns : []
    const artifacts = Array.isArray(job.artifacts) ? job.artifacts : []
    return Promise.all(artifacts.map(async (artifact, index) => {
      const turn = turns.find((item) => item.id === artifact.turnId) || turns.find((item) => item.index === artifact.turnIndex) || turns.at(-1)
      const sourceFilenames = turn?.inputFilenames?.length ? turn.inputFilenames : (job.inputs || []).map((input) => input.filename)
      const payload = {
        ...(turn?.payload || job.payload || {}),
        fileName: turn?.payload?.fileName || job.payload?.fileName || job.inputs?.[0]?.filename || '',
        fileInputs: turn?.payload?.fileInputs || job.payload?.fileInputs || job.inputs?.map((input) => ({ fieldId: input.fieldId || 'source_images', filename: input.filename })) || [],
        sourceInputs: sourceFilenames.map((filename) => {
          const input = job.inputs?.find((item) => item.filename === filename)
          return input ? { jobId: job.id, filename: input.filename, fieldId: input.fieldId || 'source_images' } : null
        }).filter(Boolean),
      }
      const outputRatio = await detectImageRatio(jobArtifactUrl(job.id, artifact.filename)).catch(() => null)
      const createdAt = artifact.createdAt || turn?.completedAt || job.updatedAt || job.createdAt || new Date().toISOString()
      return {
        ...buildStudioResult(skill, payload, { jobId: job.id, ...artifact }, outputRatio),
        id: `job-result-${job.id}-${artifact.filename || index}`,
        createdAt,
        date: createdAt,
        version: turn?.index || artifact.turnIndex || index + 1,
      }
    }))
  }

  async function monitorJob(id, skill, payload) {
    let readFailures = 0
    for (let attempt = 0; attempt < 900; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000))
      try {
        const { job } = await loadJob(id)
        setStorageState('ready')
        readFailures = 0
        setTasks((current) => current.map((task) => task.id === id ? {
          ...task,
          state: job.state,
          progress: Number.isFinite(job.progress) ? job.progress : task.progress,
          message: job.message || task.message,
        } : task))
        if (job.state === 'completed') {
          const resultVersions = await buildJobResults(job, skill)
          const completedResult = resultVersions.at(-1)
          if (!completedResult) throw new Error('本地执行器完成但没有返回图片')
          setTasks((current) => current.map((task) => task.id === id ? { ...task, resultVersions, result: completedResult } : task))
          if (activeStyleIdRef.current === skill.id && studioDraftTaskIdRef.current === id) {
            setStudioResult(completedResult)
            setStudioDraftTaskId(id)
          }
          return
        }
        if (job.state === 'failed' || job.state === 'cancelled') return
      } catch (error) {
        setStorageState('offline')
        const transient = error instanceof TypeError || /^local_api_5\d\d$/.test(error.message || '')
        if (transient && readFailures < 15) {
          readFailures += 1
          continue
        }
        setTasks((current) => current.map((task) => task.id === id ? { ...task, state: 'failed', progress: 0, message: error.message || '无法读取本地任务状态' } : task))
        return
      }
    }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, state: 'failed', progress: 0, message: '本地任务超时' } : task))
  }

  function buildJobPayload(payload, uploadEntries) {
    const { filesByField, file, skipUploadNames, ...basePayload } = payload
    return {
      ...basePayload,
      fileName: uploadEntries[0]?.filename || payload.fileName || '',
      fileInputs: uploadEntries.map(({ fieldId, filename }) => ({ fieldId, filename })),
    }
  }

  function getUploadEntries(payload, prefix = '') {
    const skipped = new Set(payload.skipUploadNames || [])
    return Object.entries(payload.filesByField || {}).flatMap(([fieldId, files]) => (Array.isArray(files) ? files : [])
      .filter((file) => !skipped.has(file.name))
      .map((file, index) => ({
        fieldId,
        file,
        filename: `${prefix}${fieldId}-${index + 1}-${file.name}`,
      })))
  }

  function continueTask(skill, payload, task, parentResult = null) {
    if (!beginTaskAction(task.id)) return
    const uploadEntries = getUploadEntries(payload, `continuation-${Date.now()}-`)
    let continuationQueued = false
    setTasks((current) => current.map((item) => item.id === task.id ? {
      ...item,
      state: 'queued',
      progress: 5,
      message: '正在连接当前 Job，准备继续修改',
    } : item))
    continueJob(task.id, buildJobPayload(payload, uploadEntries), parentResult?.artifact?.filename || '').then(async ({ job }) => {
      continuationQueued = true
      try {
        for (const entry of uploadEntries) await uploadJobInput(job.id, entry.file, entry.filename, entry.fieldId, job.activeTurnId)
        const jobPayload = buildJobPayload(payload, uploadEntries)
        setStorageState('ready')
        setTasks((current) => current.map((item) => item.id === task.id ? {
          ...item,
          state: 'running',
          progress: 28,
          message: `正在继续第 ${(job.turns || []).at(-1)?.index || 2} 轮`,
          payload: jobPayload,
        } : item))
        await runJob(task.id)
        monitorJob(task.id, skill, jobPayload)
      } catch (error) {
        if (continuationQueued) await updateJob(task.id, 'failed', error.message || '继续修改失败', 0).catch(() => {})
        throw error
      }
    }).catch((error) => {
      setStorageState('offline')
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, state: 'failed', progress: 0, message: error.message === 'local_api_409' ? '当前 Job 正在运行，暂时不能追加修改' : '继续修改失败' } : item))
    }).finally(() => endTaskAction(task.id))
  }

  function startTask(skill, payload, continuationTaskId = null, parentResult = null) {
    const existingTask = continuationTaskId && tasks.find((item) => item.id === continuationTaskId && matchesSource(item, skill))
    if (existingTask) {
      continueTask(skill, payload, existingTask, parentResult)
      return
    }
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const guided = skill.inputSchema?.some((field) => field.type === 'questions' && field.required) && skill.interaction === 'guided_required'
    setTasks((current) => [{
      id,
      ...(skill.kind === 'prompt' ? { promptId: skill.id } : { skillId: skill.id }),
      name: skill.name,
      theme: skill.theme,
      state: 'queued',
      progress: 5,
      message: '正在创建本地 Job',
      payload,
    }, ...current])
    discardStudioDraft()
    setStudioDraftTaskId(id)
    const uploadEntries = getUploadEntries(payload)
    const jobPayload = buildJobPayload(payload, uploadEntries)
    const source = skill.kind === 'prompt' ? { promptId: skill.id } : { skillId: skill.id }
    createJob({ id, ...source, payload: jobPayload }).then(async ({ job }) => {
      for (const entry of uploadEntries) await uploadJobInput(job.id, entry.file, entry.filename, entry.fieldId, job.activeTurnId)
      setStorageState('ready')
      setTasks((current) => current.map((t) => t.id === id ? {
        ...t,
        state: guided ? 'waiting_input' : 'running',
        progress: guided ? 20 : 28,
        message: guided ? '已收到你的回答，等待确认画面方向' : '正在读取风格指令',
        payload: jobPayload,
      } : t))
      if (guided) {
        updateJob(id, 'waiting_input', '已收到你的回答，等待确认画面方向', 20).catch(() => setStorageState('offline'))
        return
      }
      runJob(id).then(() => monitorJob(id, skill, { ...payload, ...jobPayload })).catch((error) => {
        setStorageState('offline')
        setTasks((current) => current.map((t) => t.id === id ? { ...t, state: 'failed', progress: 0, message: error.message || '无法启动本地执行器' } : t))
      })
    }).catch(() => {
      setStorageState('offline')
      setTasks((current) => current.map((t) => t.id === id ? { ...t, state: 'failed', progress: 0, message: '本地 Job 创建或上传失败' } : t))
      updateJob(id, 'failed', '本地 Job 创建或上传失败', 0).catch(() => {})
    })
  }

  function beginTaskAction(id) {
    if (taskActionLocksRef.current.has(id)) return false
    taskActionLocksRef.current.add(id)
    return true
  }

  function endTaskAction(id) {
    taskActionLocksRef.current.delete(id)
  }

  function answerTask(id) {
    if (!beginTaskAction(id)) return
    const task = tasks.find((item) => item.id === id)
    const skill = findSource(task, skills, prompts)
    if (!task || !skill) { endTaskAction(id); return }
    setTasks((current) => current.map((t) => t.id === id ? { ...t, state: 'running', progress: 52, message: '已收到回答，继续生成' } : t))
    runJob(id).then(() => monitorJob(id, skill, task?.payload || {})).catch((error) => {
      setStorageState('offline')
      setTasks((current) => current.map((t) => t.id === id ? { ...t, state: 'failed', progress: 0, message: error.message || '无法启动本地执行器' } : t))
    }).finally(() => endTaskAction(id))
  }

  async function cancelTask(id) {
    try {
      const { job } = await cancelJob(id)
      setTasks((current) => current.map((task) => task.id === id ? {
        ...task,
        state: job.state,
        progress: Number.isFinite(job.progress) ? job.progress : 0,
        message: job.message || '任务已取消',
      } : task))
    } catch (error) {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, message: error.message || '取消任务失败' } : task))
    }
  }

  function retryTask(id) {
    if (!beginTaskAction(id)) return
    const task = tasks.find((item) => item.id === id)
    const skill = findSource(task, skills, prompts)
    if (!task || !skill) { endTaskAction(id); return }
    setTasks((current) => current.map((item) => item.id === id ? { ...item, state: 'running', progress: 10, message: '正在重试本地 Job' } : item))
    runJob(id).then(() => monitorJob(id, skill, task.payload || {})).catch((error) => {
      setStorageState('offline')
      setTasks((current) => current.map((item) => item.id === id ? { ...item, state: 'failed', progress: 0, message: error.message || '无法重试本地执行器' } : item))
    }).finally(() => endTaskAction(id))
  }

  function goResults() { navigateAway('results') }

  function focusLatestTask() {
    const latest = tasks[0]
    if (!latest) return
    const taskElement = [...document.querySelectorAll('[data-task-id]')].find((element) => element.dataset.taskId === latest.id)
    if (taskElement && taskElement.offsetParent !== null) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      taskElement.classList.add('task-focus')
      window.setTimeout(() => taskElement.classList.remove('task-focus'), 1200)
      return
    }
    const skill = findSource(latest, skills, prompts)
    if (!skill) return
    if (latest.result) {
      openTaskResult(latest)
      return
    }
    openSkill(skill, latest.payload || null)
    setStudioDraftTaskId(latest.id)
  }

  function openTaskResult(task, selectedResult = null) {
    const skill = findSource(task, skills, prompts)
    const selected = selectedResult || task.result
    if (!skill || !selected) return
    if (activeStyle?.id !== skill.id) {
      if (!confirmLeaveStudio()) return
      discardStudioDraft()
      setActiveStyle(skill)
    }
    setStudioPrefill({
      ...(selected.payload || {}),
      sourceInput: selected.sourceInput || null,
      sourceInputs: selected.sourceInputs || [],
    })
    setStudioResult(selected)
    setStudioDraftTaskId(task.id)
  }

  function viewResult(result) {
    if (result.image) setViewingResult(result)
  }

  async function downloadResult(result) {
    if (!result.image) return
    try {
      const response = await fetch(result.image)
      if (!response.ok) throw new Error(`download_${response.status}`)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `${result.title || 'style-shelf-result'}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      window.open(result.image, '_blank', 'noopener,noreferrer')
    }
  }

  async function regenerateResult(result) {
    const skill = findSource(result, skills, prompts) || [...skills, ...prompts].find((item) => item.name === result.styleName)
    if (!skill) return
    const task = result.jobId && tasks.find((item) => item.id === result.jobId)
    if (task) {
      openTaskResult(task, result)
      return
    }
    let prefill = result.payload || null
    if (result.jobId) {
      try {
        const { job } = await loadJob(result.jobId)
        if (job?.payload) prefill = { ...job.payload, sourceInput: result.sourceInput || null }
      } catch {}
    }
    openSkill(skill, prefill)
  }

  async function saveStudioResult(result, coverRatio, coverPosition) {
    const savedResult = { ...result, coverRatio, coverPosition }
    setSaveError('')
    try {
      const skill = findSource(result, skills, prompts)
      if (!skill?.cover && result.jobId && result.image) {
        const update = skill.kind === 'prompt' ? updatePrompt : updateSkill
        const response = await update(skill.id, {
          cover: result.image,
          coverPosition,
          coverStatus: 'generated',
          ...(skill.kind === 'prompt' ? {} : { coverSource: 'skill-output', coverFrameRatio: '4:5', ready: true }),
        })
        const updated = response.prompt || response.skills?.find((item) => item.id === result.skillId)
        if (updated) {
          if (skill.kind === 'prompt') setPrompts((current) => current.map((item) => item.id === updated.id ? updated : item))
          else setSkills((current) => current.map((item) => item.id === updated.id ? updated : item))
        }
      }
      const saveResponse = await saveResult(savedResult)
      setResults((current) => [savedResult, ...current.filter((item) => item.id !== savedResult.id)])
      if (saveResponse?.usageCounted) {
        setSkills((current) => current.map((item) => item.id === result.skillId
          ? { ...item, works: (Number.isFinite(item.works) ? item.works : 0) + 1 }
          : item))
      }
      setStorageState('ready')
      discardStudioDraft()
      setActiveStyle(null)
      setView('results')
    } catch {
      setStorageState('offline')
      setSaveError('本地服务未连接，结果和风格封面暂未保存。启动本地服务后可再次点击保存。')
    }
  }

  async function saveSkillCover(skill, image, position) {
    setCoverEditError('')
    try {
      const response = await updateSkill(skill.id, {
        cover: image,
        coverPosition: position,
        coverStatus: 'generated',
        coverSource: 'skill-output',
        coverFrameRatio: '4:5',
        ready: true,
      })
      const updated = response.skills?.find((item) => item.id === skill.id)
      if (!updated) throw new Error('skill_cover_update_failed')
      setSkills((current) => current.map((item) => item.id === updated.id ? updated : item))
      setCoverEditSkill(null)
    } catch {
      setCoverEditError('封面保存失败，请确认本地服务仍在运行。')
    }
  }

  async function performRemoveSkill(skill) {
    try {
      const response = await deleteSkill(skill.id)
      setSkills(response.skills || [])
    } catch {
      // A stale card can issue a second delete after the server has already
      // removed the Skill. Refresh before reporting an error so that this
      // normal stale-state case does not look like a failed deletion.
      try {
        const catalog = await loadSkillCatalog()
        setSkills(catalog)
        if (!catalog.some((item) => item.id === skill.id)) return
      } catch {}
      window.alert('移出失败，请确认本地服务仍在运行。')
    }
  }

  function removeSkillFromShelf(skill) {
    setConfirmState({
      title: '移出工作台',
      message: `从工作台移出「${skill.name}」？不会删除本机 Codex Skill，历史结果也不会被删除。`,
      confirmLabel: '移出工作台',
      onConfirm: async () => { setConfirmState(null); await performRemoveSkill(skill) },
    })
  }

  async function performRemoveResult(result) {
    try {
      await deleteResult(result.id)
      setResults((current) => current.filter((item) => item.id !== result.id))
      setStorageState('ready')
    } catch {
      window.alert('结果删除失败，请确认本地服务仍在运行。')
    }
  }

  function removeResult(result) {
    setConfirmState({
      title: '删除图库结果',
      message: `删除「${result.title || '这条结果'}」？只会从图库移除，不会删除原始 Job 文件。`,
      confirmLabel: '删除结果',
      onConfirm: async () => { setConfirmState(null); await performRemoveResult(result) },
    })
  }

  return (
    <div className={`app app-${activeStyle ? 'studio' : view}`}>
      <Header view={view} latestTask={tasks[0] || null} onView={navigateAway} onLatestTask={focusLatestTask} storageState={storageState} onAddSkill={() => setWorkshopOpen(true)} onAddPrompt={() => openPromptEditor()} onSettings={() => setSettingsOpen(true)} />
      <div className="app-body">
        <Sidebar view={view} setView={navigateAway} resultCount={results.length} skillCount={skills.length} promptCount={prompts.length} onSettings={() => setSettingsOpen(true)} />
        <main className="center">
          {activeStyle ? (
            <CreationStudio
              skill={activeStyle}
              prefill={studioPrefill}
              result={studioResult}
              backgroundTaskCount={tasks.filter((task) => matchesSource(task, activeStyle) && ['queued', 'running', 'waiting_input'].includes(task.state)).length}
              taskHistory={tasks.filter((task) => matchesSource(task, activeStyle) && task.result)}
              selectedTaskId={studioDraftTaskId}
              selectedTaskState={tasks.find((task) => task.id === studioDraftTaskId)?.state || null}
              selectedTaskMessage={tasks.find((task) => task.id === studioDraftTaskId)?.message || ''}
              onBack={closeStudio}
              onSubmit={(skill, payload, taskId, parentResult) => startTask(skill, payload, taskId, parentResult)}
              onNewTask={beginNewStudioTask}
              onSaveResult={saveStudioResult}
              onSelectTaskResult={(task, result) => openTaskResult(task, result)}
              saveError={saveError}
            />
          ) : view === 'shelf' ? (
            <ShelfView
              skills={visibleSkills}
              prompts={prompts}
              results={results}
              onOpen={openSkill}
              onAddPrompt={() => openPromptEditor()}
              onEditPrompt={openPromptEditor}
              onRemovePrompt={removePromptFromShelf}
              onViewResults={goResults}
              onViewResult={viewResult}
              onEditCover={(skill) => { setCoverEditError(''); setCoverEditSkill(skill) }}
              onRemoveSkill={removeSkillFromShelf}
              onReorder={reorderSkills}
            />
          ) : (
            <ResultsView results={results} skills={skills} prompts={prompts} onView={viewResult} onAgain={regenerateResult} onDownload={downloadResult} onDelete={removeResult} />
          )}
        </main>
        <ContextRail
          skills={skills}
          tasks={tasks}
          results={results}
          draftTaskId={studioDraftTaskId}
          onAnswer={answerTask}
          onCancel={cancelTask}
          onRetry={retryTask}
          onOpenTaskResult={openTaskResult}
          onViewResults={goResults}
          onOpenWorkshop={() => setWorkshopOpen(true)}
        />
      </div>
      {workshopOpen && <SkillWorkshop skills={skills} onClose={() => setWorkshopOpen(false)} onRefresh={refreshSkills} />}
      {promptEditor && <PromptEditor prompt={promptEditor} onClose={() => setPromptEditor(null)} onSave={savePromptForm} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {coverEditSkill && <SkillCoverEditor skill={coverEditSkill} results={results} error={coverEditError} onClose={() => setCoverEditSkill(null)} onSave={saveSkillCover} />}
      {viewingResult && <ResultViewer result={viewingResult} onClose={() => setViewingResult(null)} />}
      {confirmState && <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(null)} />}
    </div>
  )
}

function Header({ view, latestTask, onView, onLatestTask, storageState, onAddSkill, onAddPrompt, onSettings }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-text">
          <strong>STYLE SHELF</strong>
          <small>个人风格工作台</small>
        </div>
      </div>
      <nav className="top-nav" aria-label="主导航">
        <button className={view === 'shelf' ? 'top-nav-link active' : 'top-nav-link'} onClick={() => onView('shelf')}>风格仓库</button>
        <button className={view === 'results' ? 'top-nav-link active' : 'top-nav-link'} onClick={() => onView('results')}>图库</button>
      </nav>
      <div className="topbar-actions">
        <button
          className="latest-task-button"
          type="button"
          disabled={!latestTask}
          onClick={onLatestTask}
          aria-label={latestTask ? `继续上次任务：${latestTask.name}，${latestTask.state === 'running' ? `运行中 ${latestTask.progress}%` : TASK_STATE_LABEL[latestTask.state] || '状态未知'}` : '暂无后台任务'}
        >
          <span className="latest-task-title">{latestTask ? `继续：${latestTask.name}` : '暂无最新任务'}</span>
          <b>{latestTask ? (latestTask.state === 'running' ? `${latestTask.progress}%` : TASK_STATE_LABEL[latestTask.state]) : '暂无'}</b>
        </button>
        <button className="btn-outline" onClick={onAddSkill}>添加 Skill</button>
        <button className="btn-outline" onClick={onAddPrompt}>添加 Prompt</button>
        <span className={`storage-status storage-${storageState}`} title="本地结果存储状态">
          {storageState === 'ready' ? '本地已连接' : storageState === 'offline' ? '本地未连接' : '检查本地服务'}
        </span>
        <button className="settings-button" aria-label="诊断" onClick={onSettings}>⚙</button>
      </div>
    </header>
  )
}

function Sidebar({ view, setView, resultCount, skillCount, promptCount, onSettings }) {
  return (
    <aside className="sidebar">
      <p className="side-label">工作区</p>
      <nav className="side-nav">
        <button className={view === 'shelf' ? 'side-link active' : 'side-link'} onClick={() => setView('shelf')}>
          <span className="no">01</span> 风格仓库
        </button>
        <button className={view === 'results' ? 'side-link active' : 'side-link'} onClick={() => setView('results')}>
          <span className="no">02</span> 图库 <b>{resultCount}</b>
        </button>
      </nav>
      <div className="side-footer">
        <div className="store-info">
          <span className="store-icon">◧</span>
          <div>
            <strong>本地资料库</strong>
            <small>~/StyleShelf · {skillCount} 个 Skill · {promptCount} 个 Prompt</small>
          </div>
        </div>
        <button className="settings-link" onClick={onSettings}>诊断</button>
      </div>
    </aside>
  )
}

/* ---------------- 风格仓库（中央主视图） ---------------- */

function ShelfView({ skills, prompts, results, onOpen, onAddPrompt, onEditPrompt, onRemovePrompt, onViewResults, onViewResult, onEditCover, onRemoveSkill, onReorder }) {
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [shelfType, setShelfType] = useState('skill')

  function clearDrag() {
    setDraggingId(null)
    setDragOverId(null)
  }

  return (
    <section className="shelf-page page-enter">
      <div className="shelf-intro">
        <div>
          <h1>我的风格仓库</h1>
          <p>{shelfType === 'skill' ? '已加入工作台的 Skill，随时进入创作。' : '已保存的 Prompt 模板，随时进入创作。'}</p>
        </div>
        <div className="shelf-count"><strong>{shelfType === 'skill' ? skills.length : prompts.length}</strong><span>个风格</span></div>
      </div>
      <div className="shelf-tabs" role="tablist" aria-label="风格类型">
        <button type="button" role="tab" aria-selected={shelfType === 'skill'} className={shelfType === 'skill' ? 'active' : ''} onClick={() => setShelfType('skill')}>Skill 风格</button>
        <button type="button" role="tab" aria-selected={shelfType === 'prompt'} className={shelfType === 'prompt' ? 'active' : ''} onClick={() => setShelfType('prompt')}>Prompt 风格</button>
      </div>
      {shelfType === 'skill' ? <div className="collection-grid">
        {skills.map((skill) => <SkillCard key={skill.id} skill={skill} isDragging={draggingId === skill.id} isDragOver={dragOverId === skill.id && draggingId !== skill.id} onDragStart={() => setDraggingId(skill.id)} onDragOver={() => setDragOverId(skill.id)} onDrop={() => { onReorder(draggingId, skill.id); clearDrag() }} onDragEnd={clearDrag} onOpen={onOpen} onEditCover={onEditCover} onRemoveSkill={onRemoveSkill} />)}
      </div> : <div className="collection-grid">
        {prompts.map((prompt, index) => <PromptCard key={prompt.id} prompt={{ ...prompt, index: `P.${String(index + 1).padStart(2, '0')}` }} onOpen={onOpen} onEdit={onEditPrompt} onRemove={onRemovePrompt} />)}
        <button type="button" className="prompt-add-card" onClick={onAddPrompt}><strong>+</strong><span>添加 Prompt</span></button>
      </div>}
      {(shelfType === 'skill' ? skills : prompts).length === 0 && <div className="empty-hint">还没有可用的{ shelfType === 'skill' ? ' Skill' : ' Prompt'}。</div>}
      <section className="recent-strip">
        <div className="recent-heading"><h2>最近作品</h2><button onClick={onViewResults}>查看全部 <span>→</span></button></div>
        <div className="recent-row">
          {results.slice(0, 6).map((result) => (
            <button className="recent-work" key={result.id} onClick={() => result.image ? onViewResult(result) : onViewResults()} aria-label={result.image ? `查看${result.title || '作品'}原图` : '打开图库'}>
              {result.image ? <img src={result.image} alt={result.title} /> : <span className="recent-placeholder">样片待接入</span>}
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}

function SkillCard({ skill, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onOpen, onEditCover, onRemoveSkill }) {
  return (
    <article
      className={`skill-card ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
      draggable="true"
      aria-label={`${skill.name}，按住拖动调整顺序`}
      onDragStart={onDragStart}
      onDragOver={(event) => { event.preventDefault(); onDragOver() }}
      onDrop={(event) => { event.preventDefault(); onDrop() }}
      onDragEnd={onDragEnd}
    >
      <button className="card-visual" onClick={() => onOpen(skill)} aria-label={`打开 ${skill.name} 的工作区`}>
        <CardVisual skill={skill} />
        <span className="open-hint">{skill.installed === false ? '需先安装 ↗' : '打开工作区 ↗'}</span>
      </button>
      <div className="card-body">
        <div className="card-names"><h2 title={skill.name} aria-label={skill.name}>{skill.name}</h2><span className="card-usage">{skill.works} 次使用</span></div>
        <span className="card-en">{skill.english}</span>
        <p className="card-desc">{skill.summaryZh || skill.styleSummaryZh || '按此 Skill 的原始视觉规则生成。'}</p>
        <button className="card-cover-edit" type="button" onClick={() => onEditCover(skill)}>更换封面</button>
        <button className="card-skill-remove" type="button" onClick={() => onRemoveSkill(skill)}>移出工作台</button>
      </div>
      <div className="card-foot">
        <div className="skill-tag-row" aria-label="Skill 标签">
          <span className="skill-tag">{skill.modeLabel}</span>
          <span className="skill-tag">{skill.scenes[0]}</span>
        </div>
        <SkillSource skill={skill} compact />
      </div>
    </article>
  )
}

function PromptCard({ prompt, onOpen, onEdit, onRemove }) {
  return (
    <article className="skill-card prompt-card">
      <button className="card-visual" onClick={() => onOpen(prompt)} aria-label={`打开 ${prompt.name} 的工作区`}>
        <CardVisual skill={prompt} />
        <span className="open-hint">打开工作区 ↗</span>
      </button>
      <div className="card-body">
        <div className="card-names"><h2 title={prompt.name}>{prompt.name}</h2><span className="prompt-mark">PROMPT</span></div>
        <span className="card-en">{prompt.modeLabel}</span>
        <p className="card-desc">{prompt.summary || '按这个 Prompt 的固定风格规则生成。'}</p>
        <button className="card-cover-edit" type="button" onClick={() => onEdit(prompt)}>编辑 Prompt</button>
        <button className="card-skill-remove" type="button" onClick={() => onRemove(prompt)}>删除 Prompt</button>
      </div>
      <div className="card-foot"><div className="skill-tag-row"><span className="skill-tag">{prompt.modeLabel}</span><span className="skill-tag">{prompt.index}</span></div><span className="prompt-fixed-label">固定模板</span></div>
    </article>
  )
}

function PromptEditor({ prompt, onClose, onSave }) {
  const [values, setValues] = useState({ name: prompt.name || '', summary: prompt.summary || '', mode: prompt.mode || 'image', template: prompt.template || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try { await onSave(values) } catch (saveError) { setError(saveError.message || 'Prompt 保存失败') } finally { setSaving(false) }
  }

  return (
    <div className="workshop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="workshop-panel prompt-editor" role="dialog" aria-modal="true" aria-labelledby="prompt-editor-title">
        <div className="workshop-head"><div><p className="kicker">PROMPT TEMPLATE</p><h2 id="prompt-editor-title">{prompt.id ? '编辑 Prompt' : '添加 Prompt'}</h2><p>保存可用于多个主体的固定风格规则；单张图片专用描述不适合作为模板。</p></div><button className="workshop-close" type="button" onClick={onClose} aria-label="关闭">×</button></div>
        <form className="workshop-form" onSubmit={submit}>
          <label className="field"><span>名称</span><input value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required maxLength={200} /></label>
          <label className="field"><span>说明（可选）</span><input value={values.summary} onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))} maxLength={500} /></label>
          <div className="field"><span>类型</span><div className="prompt-mode-options"><label><input type="radio" name="prompt-mode" value="image" checked={values.mode === 'image'} onChange={() => setValues((current) => ({ ...current, mode: 'image' }))} />图片转化型</label><label><input type="radio" name="prompt-mode" value="text" checked={values.mode === 'text'} onChange={() => setValues((current) => ({ ...current, mode: 'text' }))} />纯文本生成型</label></div></div>
          <label className="field"><span>固定 Prompt 正文</span><textarea value={values.template} onChange={(event) => setValues((current) => ({ ...current, template: event.target.value }))} required maxLength={30000} rows={10} /></label>
          {error && <p className="workshop-error" role="alert">{error}</p>}
          <button className="run workshop-save" type="submit" disabled={saving}>{saving ? '正在保存…' : '保存 Prompt'}</button>
        </form>
      </section>
    </div>
  )
}

function SkillCoverEditor({ skill, results, error, onClose, onSave }) {
  const options = useMemo(() => {
    const outputResults = results
      .filter((result) => result.skillId === skill.id && result.image)
      .map((result, index) => ({
        ...result,
        coverLabel: `第 ${index + 1} 张 · ${formatLocalResultDate(result.createdAt || result.date, '生成作品')}`,
      }))
    if (skill.cover && !outputResults.some((result) => result.image === skill.cover)) {
      return [{ id: 'current-cover', coverLabel: '当前封面', image: skill.cover, coverPosition: skill.coverPosition }, ...outputResults]
    }
    return outputResults
  }, [results, skill])
  const [selected, setSelected] = useState(options[0] || null)
  const [position, setPosition] = useState(options[0]?.coverPosition || { x: 50, y: 50 })
  const dragging = useRef(false)

  useEffect(() => {
    const next = options[0] || null
    setSelected(next)
    setPosition(next?.coverPosition || { x: 50, y: 50 })
  }, [skill.id, options])

  function updatePosition(clientX, clientY, element) {
    const rect = element.getBoundingClientRect()
    setPosition({
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    })
  }

  function handlePointerDown(event) {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePosition(event.clientX, event.clientY, event.currentTarget)
  }

  function handlePointerMove(event) {
    if (dragging.current) updatePosition(event.clientX, event.clientY, event.currentTarget)
  }

  function handlePointerUp(event) {
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="cover-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="cover-editor" role="dialog" aria-modal="true" aria-labelledby="cover-editor-title">
        <div className="cover-editor-head">
          <div><p className="kicker">SKILL COVER</p><h2 id="cover-editor-title">更换「{skill.name}」封面</h2><p>只能选择这个 Skill 的生成结果，封面框固定为 4:5。</p></div>
          <button className="workshop-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        {options.length ? (
          <div className="cover-editor-grid">
            <div className="cover-editor-preview-wrap">
              <div
                className="cover-editor-preview"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="application"
                aria-label="拖动图片调整封面取景"
              >
                <img src={selected?.image} alt="封面预览" style={{ objectPosition: `${position.x}% ${position.y}%` }} />
                <span>封面 · 4:5</span>
              </div>
              <small>拖动图片调整取景位置</small>
            </div>
            <div className="cover-editor-options">
              <strong>选择一张已生成作品</strong>
              <div className="cover-source-grid">
                {options.map((option) => (
                  <button type="button" key={option.id} className={selected?.id === option.id ? 'cover-source selected' : 'cover-source'} onClick={() => { setSelected(option); setPosition(option.coverPosition || { x: 50, y: 50 }) }}>
                    <img src={option.image} alt={option.title || skill.name} />
                    <span>{option.coverLabel || '生成结果'}</span>
                  </button>
                ))}
              </div>
              {error && <p className="cover-editor-error" role="alert">{error}</p>}
              <div className="cover-editor-actions">
                <button type="button" className="cover-editor-cancel" onClick={onClose}>取消</button>
                <button type="button" className="cover-save" disabled={!selected} onClick={() => onSave(skill, selected.image, position)}>保存封面</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cover-editor-empty"><strong>还没有可用的生成结果</strong><p>先运行这个 Skill 并保存一次结果，之后就可以在这里更换封面。</p><button type="button" className="cover-save" onClick={onClose}>返回风格仓库</button></div>
        )}
      </section>
    </div>
  )
}

/* ---------------- 创作工作区 ---------------- */

function CreationStudio({ skill, prefill, result, backgroundTaskCount, taskHistory, selectedTaskId, selectedTaskState, selectedTaskMessage, onBack, onSubmit, onNewTask, onSaveResult, onSelectTaskResult, saveError }) {
  const [values, setValues] = useState({})
  const [filesByField, setFilesByField] = useState({})
  const [answers, setAnswers] = useState({})
  const [continuationPrompt, setContinuationPrompt] = useState('')
  const [coverRatio, setCoverRatio] = useState('4:3')
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 })
  const restoredFileNamesRef = useRef(new Set())
  const continuing = Boolean(result && selectedTaskId)
  const continuationBusy = continuing && ['queued', 'running', 'waiting_input'].includes(selectedTaskState)

  useEffect(() => {
    if (result) {
      setCoverRatio(result.coverRatio || '4:3')
      setCoverPosition(result.coverPosition || { x: 50, y: 50 })
    }
  }, [result])

  useEffect(() => {
    if (!prefill) {
      restoredFileNamesRef.current.clear()
      setValues({})
      setFilesByField({})
      setAnswers({})
      setContinuationPrompt('')
      return
    }
    restoredFileNamesRef.current.clear()
    let active = true
    setValues(prefill.fields || {
      ...(prefill.text ? { direction: prefill.text } : {}),
      ...(prefill.ratio ? { ratio: prefill.ratio } : {}),
    })
    setAnswers(prefill.answers || {})
    const sourceInputs = prefill.sourceInputs?.length ? prefill.sourceInputs : (prefill.sourceInput ? [prefill.sourceInput] : [])
    if (!sourceInputs.length) {
      setFilesByField({})
      return () => { active = false }
    }
    Promise.all(sourceInputs.filter((input) => input?.jobId && input.filename).map(async (input) => {
      const response = await fetch(jobInputUrl(input.jobId, input.filename))
      if (!response.ok) throw new Error('input_load_failed')
      const blob = await response.blob()
      return { fieldId: input.fieldId || 'source_images', file: new File([blob], input.filename, { type: blob.type || 'application/octet-stream' }) }
    })).then((restored) => {
      if (!active) return
      restoredFileNamesRef.current = new Set(restored.map((item) => item.file.name))
      setFilesByField(restored.reduce((groups, item) => ({ ...groups, [item.fieldId]: [...(groups[item.fieldId] || []), item.file] }), {}))
    }).catch(() => { if (active) setFilesByField({}) })
    return () => { active = false }
  }, [prefill])

  useEffect(() => {
    setContinuationPrompt('')
  }, [selectedTaskId, result?.id])

  const inputSchema = skill.inputSchema || []
  const fieldValue = (id) => values[id] || ''
  const fieldFiles = (id) => filesByField[id] || []
  const fieldReady = (field) => {
    if (field.type === 'image') return fieldFiles(field.id).length > 0
    if (field.type === 'textarea') return String(fieldValue(field.id)).trim().length > 0
    if (field.type === 'questions') return Object.keys(answers).length > 0
    return true
  }
  const ready = inputSchema.filter((field) => field.required).every((field) => {
    return fieldReady(field)
  }) && (!skill.requiredAny?.length || skill.requiredAny.some((id) => fieldReady(inputSchema.find((field) => field.id === id) || { id, type: 'textarea' }))) && (!continuing || continuationPrompt.trim().length > 0)

  function renderField(field) {
    if (field.type === 'image') {
      const names = fieldFiles(field.id).map((file) => file.name)
      return (
        <label className="drop" key={field.id}>
          <input type="file" accept="image/*" multiple={Boolean(field.multiple)} onChange={(e) => setFilesByField((current) => {
            for (const file of current[field.id] || []) restoredFileNamesRef.current.delete(file.name)
            return { ...current, [field.id]: Array.from(e.target.files || []) }
          })} />
          <span className="drop-plus">+</span>
          <strong>{names.length ? names.join('、') : `拖入${field.label}，或点击选择`}</strong>
          <small>{field.hint}</small>
        </label>
      )
    }
    if (field.type === 'textarea') {
      return (
        <label className="field" key={field.id}>
          <span>{field.label}</span>
          <textarea value={fieldValue(field.id)} onChange={(e) => setValues((current) => ({ ...current, [field.id]: e.target.value }))} placeholder={field.placeholder || ''} />
        </label>
      )
    }
    if (field.type === 'ratio') {
      return (
        <div className="field" key={field.id}>
          <span>{field.label}</span>
          <div className="ratio-row">
            {field.options.map((option) => <button type="button" key={option} className={fieldValue(field.id) === option ? 'ratio on' : 'ratio'} onClick={() => setValues((current) => ({ ...current, [field.id]: option }))}>{option}</button>)}
          </div>
        </div>
      )
    }
    if (field.type === 'select') {
      return (
        <label className="field" key={field.id}>
          <span>{field.label}</span>
          <select value={fieldValue(field.id)} onChange={(e) => setValues((current) => ({ ...current, [field.id]: e.target.value }))}>
            <option value="">请选择</option>
            {field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      )
    }
    if (field.type === 'questions') {
      return (
        <div className="question-list" key={field.id}>
          <span className="field-label">{field.label}</span>
          {(field.questions || (skill.mode === 'guided' ? GUIDED_QUESTIONS : [])).map((q) => (
            <div key={q.id} className={answers[q.id] ? 'q-card answered' : 'q-card'}>
              <p className="q-label">{q.label}</p>
              <p className="q-text">{q.question}</p>
              <div className="q-options">
                {q.options.map((opt) => <button type="button" key={opt} className={answers[q.id] === opt ? 'q-opt on' : 'q-opt'} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}>{opt}</button>)}
              </div>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  function submit(e) {
    e.preventDefault()
    const firstFile = Object.values(filesByField).flat()[0] || null
    const text = continuing ? continuationPrompt.trim() : (values.text || values.direction || '')
    const fields = continuing ? { ...values, continuationPrompt: text } : values
    onSubmit(skill, { fields, text, fileName: firstFile?.name || '', filesByField, skipUploadNames: [...restoredFileNamesRef.current], answers, ratio: values.ratio || '3:4' }, selectedTaskId || null, result || null)
  }

  return (
    <section className="page page-enter studio">
      <div className="studio-topline">
        <button className="back" onClick={onBack}>← 返回风格仓库</button>
        <span className="crumb">CREATION STUDIO / {skill.english}</span>
      </div>

      <div className="studio-head">
        <span className="studio-chip" />
        <div>
          <h1>{skill.name}</h1>
          <StudioDescription skill={skill} />
          {skill.kind !== 'prompt' && <SkillSource skill={skill} />}
        </div>
        <span className="studio-ver">{skill.kind === 'prompt' ? 'Prompt 模板' : `本地 Skill · ${formatSkillVersion(skill.version)}`}</span>
      </div>

      <div className="studio-cols">
        <form className="studio-form" onSubmit={submit}>
          <div className="form-head">
            <strong>输入</strong>
            <span>{skill.kind === 'prompt' ? '输入会和固定 Prompt 一起发送' : (skill.needsReview ? '输入能力尚未完全确认，图片和文字都可以尝试' : '输入会按这个 Skill 自己的方式处理')}</span>
          </div>

          {inputSchema.map(renderField)}

          {continuing && (
            <label className="field continuation-prompt">
              <span>本轮修改提示</span>
              <textarea value={continuationPrompt} onChange={(e) => setContinuationPrompt(e.target.value)} placeholder="告诉这个 Skill 你想基于当前成果修改什么，例如：保留主体，把色彩改成冷蓝，减少文字并扩大留白" />
              <small>这段提示会和当前成果一起发送给同一个后台 Job，不会新建独立任务。</small>
            </label>
          )}

          <button className="run" type="submit" disabled={!ready || continuationBusy}>
            <span>{continuing ? '继续修改当前任务' : `运行这个${skill.kind === 'prompt' ? ' Prompt' : ' Skill'}`}</span><b>{continuationBusy ? (selectedTaskMessage || '后台处理中') : backgroundTaskCount ? `后台已有 ${backgroundTaskCount} 个` : '⌘ ↵'}</b>
          </button>
          {result && selectedTaskId && <button className="studio-new-task" type="button" onClick={onNewTask}>新建独立任务</button>}
          <p className="phase-note">输入由当前{skill.kind === 'prompt' ? ' Prompt' : ' Skill'} 的配置决定</p>
        </form>

        <aside className="studio-side">
          <div className="side-block">
            <div className="side-block-head"><span>{result?.image ? '当前修改成果' : '风格预览'}</span><span>{result?.image ? '本轮基于此图' : (skill.cover ? '真实示例' : '需先生成样例')}</span></div>
            {result?.image ? (
              <div className="studio-current-preview">
                <img src={result.image} alt={`${result.title || skill.name} 当前修改成果`} />
              </div>
            ) : <CardVisual skill={skill} size="preview" />}
          </div>
          <div className="side-block">
            <div className="side-block-head"><span>参数摘要</span></div>
            <dl className="param-list">
              <div><dt>输入方式</dt><dd>{skill.modeLabel}</dd></div>
              <div><dt>执行引擎</dt><dd>本地执行器 · 按当前配置运行</dd></div>
              <div><dt>{skill.kind === 'prompt' ? '模板类型' : 'Skill 版本'}</dt><dd>{skill.kind === 'prompt' ? skill.modeLabel : formatSkillVersion(skill.version)}</dd></div>
              <div><dt>输出位置</dt><dd>jobs/&lt;job-id&gt;/output</dd></div>
            </dl>
          </div>
        </aside>
      </div>
      {result && (
        <GeneratedResultPanel
          result={result}
          ratio={coverRatio}
          position={coverPosition}
          onRatioChange={setCoverRatio}
          onPositionChange={setCoverPosition}
          onSave={() => onSaveResult(result, coverRatio, coverPosition)}
          saveError={saveError}
          needsCover={!skill.cover}
          sourceKind={skill.kind}
        />
      )}
      {taskHistory.length > 0 && <TaskResultHistory tasks={taskHistory} styleName={skill.name} sourceKind={skill.kind} selectedTaskId={selectedTaskId} onSelect={onSelectTaskResult} />}
    </section>
  )
}

function TaskResultHistory({ tasks, styleName, sourceKind, selectedTaskId, onSelect }) {
  const entries = tasks.flatMap((task) => {
    const grouped = new Map()
    const results = task.resultVersions?.length ? task.resultVersions : task.result ? [task.result] : []
    results.forEach((result, index) => {
      const version = result.version || index + 1
      const key = `${task.id}-${version}`
      const previous = grouped.get(key)
      grouped.set(key, { task, result, version, count: (previous?.count || 0) + 1 })
    })
    return [...grouped.values()]
  })
  return (
    <section className="task-result-history">
      <div className="task-result-history-head">
        <div><p className="kicker">RUN HISTORY</p><h2>这个{sourceKind === 'prompt' ? ' Prompt' : ' Skill'} 的运行成果</h2></div>
        <span>{entries.length} 个版本 · {tasks.length} 个任务</span>
      </div>
      <div className="task-result-history-list">
        {entries.map(({ task, result, version, count }) => (
          <button type="button" key={`${task.id}-${result.id}`} className={task.id === selectedTaskId && result.id === task.result?.id ? 'task-result-item selected' : 'task-result-item'} onClick={() => onSelect(task, result)}>
            {result.image ? <img src={result.image} alt={result.title} /> : <span className="task-result-art" />}
            <span><strong>{result.title}</strong><small>{formatLocalResultDate(result.createdAt || result.date)} · 第 {version} 轮{count > 1 ? ` · ${count} 张图` : ''} · {task.id}</small></span>
          </button>
        ))}
      </div>
    </section>
  )
}

function GeneratedResultPanel({ result, ratio, position, onRatioChange, onPositionChange, onSave, saveError, needsCover, sourceKind = 'skill' }) {
  const dragging = useRef(false)

  function updatePosition(clientX, clientY, element) {
    const rect = element.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    onPositionChange({ x, y })
  }

  function handlePointerDown(event) {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePosition(event.clientX, event.clientY, event.currentTarget)
  }

  function handlePointerMove(event) {
    if (dragging.current) updatePosition(event.clientX, event.clientY, event.currentTarget)
  }

  function handlePointerUp(event) {
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section className="generated-result">
      <div className="generated-result-head">
        <div>
          <p className="kicker">RESULT READY</p>
          <h2>生成完成，保存这张作品</h2>
          <p>{needsCover ? `这是该${sourceKind === 'prompt' ? ' Prompt' : ' Skill'} 的首次产出，保存后会同时作为风格卡片封面。` : '先选择图库的封面比例，再保存。原图尺寸不会被裁切。'}</p>
        </div>
        <span className="generated-status">待保存</span>
      </div>
      <div className="generated-result-body">
        <div
          className={`generated-cover-preview generated-cover-${ratio === '3:4' ? 'portrait' : 'landscape'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="application"
          aria-label="拖动图片调整封面取景"
        >
          {result.image ? <img src={result.image} alt={`${result.title} 生成结果`} style={{ objectPosition: `${position.x}% ${position.y}%` }} /> : (
            <div className="generated-result-art">
              <span>模拟生成结果</span>
              <strong>{result.styleName}</strong>
            </div>
          )}
          <span className="crop-safe-area">图库封面 · {ratio}</span>
          <span className="crop-drag-hint">拖动调整取景</span>
        </div>
        <div className="generated-result-controls">
          <div className="generated-copy">
            <strong>{result.title}</strong>
            <span>{result.styleName} · 原图 {result.originalRatio}</span>
          </div>
          <div className="cover-ratio-options" aria-label="选择封面比例">
            {['4:3', '3:4'].map((option) => (
              <button type="button" key={option} className={ratio === option ? 'cover-ratio on' : 'cover-ratio'} onClick={() => onRatioChange(option)}>{option}</button>
            ))}
          </div>
          <p className="crop-position">取景位置 {Math.round(position.x)}% / {Math.round(position.y)}%</p>
          {saveError && <p className="generated-save-error" role="alert">{saveError}</p>}
          <button className="cover-save generated-save" type="button" onClick={onSave}>{needsCover ? '保存结果并生成风格封面' : '保存到图库'}</button>
        </div>
      </div>
    </section>
  )
}

function ConfirmDialog({ title, message, confirmLabel = '确认', onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div>
          <p className="kicker">请确认操作</p>
          <h2 id="confirm-title">{title}</h2>
          <p id="confirm-message">{message}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>取消</button>
          <button type="button" className="confirm-submit" autoFocus onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}

function ResultViewer({ result, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="result-viewer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="result-viewer" role="dialog" aria-modal="true" aria-label="原图查看">
        <button className="result-viewer-close" type="button" onClick={onClose} aria-label="关闭原图查看">×</button>
        <div className="result-viewer-image-wrap">
          <img className="result-viewer-image" src={result.image} alt={`${result.title || '生成结果'} 原图`} />
        </div>
      </section>
    </div>
  )
}

/* ---------------- 图库 ---------------- */

function ResultsView({ results, skills, prompts, onView, onAgain, onDownload, onDelete }) {
  const [columnCount, setColumnCount] = useState(4)
  const [filterSkillId, setFilterSkillId] = useState('all')

  useEffect(() => {
    function updateColumnCount() {
      setColumnCount(window.innerWidth <= 760 ? 2 : window.innerWidth <= 1200 ? 3 : 4)
    }
    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)
    return () => window.removeEventListener('resize', updateColumnCount)
  }, [])

  const orderedResults = useMemo(() => results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.result.createdAt || '') || 0
      const bTime = Date.parse(b.result.createdAt || '') || 0
      return bTime - aTime || a.index - b.index
    })
    .map(({ result }) => result), [results])
  const skillIdByName = useMemo(() => new Map(skills.map((skill) => [skill.name, skill.id])), [skills])
  const promptIdByName = useMemo(() => new Map(prompts.map((prompt) => [prompt.name, prompt.id])), [prompts])
  const categoryKey = (result) => result.promptId
    ? `prompt:${result.promptId}`
    : result.skillId
      ? `skill:${result.skillId}`
      : result.styleName && promptIdByName.has(result.styleName)
        ? `prompt:${promptIdByName.get(result.styleName)}`
        : result.styleName && skillIdByName.has(result.styleName)
          ? `skill:${skillIdByName.get(result.styleName)}`
          : `name:${result.styleName}`
  const filterOptions = useMemo(() => {
    const options = new Map()
    const skillNames = new Map(skills.map((skill) => [`skill:${skill.id}`, skill.name]))
    const promptNames = new Map(prompts.map((prompt) => [`prompt:${prompt.id}`, prompt.name]))
    orderedResults.forEach((result) => {
      const id = categoryKey(result)
      if (!options.has(id)) options.set(id, skillNames.get(id) || promptNames.get(id) || result.styleName || id.replace(/^(skill|prompt|name):/, ''))
    })
    return [...options.entries()]
  }, [orderedResults, skills, prompts, skillIdByName, promptIdByName])
  const filteredResults = filterSkillId === 'all'
    ? orderedResults
    : orderedResults.filter((result) => categoryKey(result) === filterSkillId)
  const columns = useMemo(() => distributeResults(filteredResults, columnCount), [filteredResults, columnCount])

  return (
    <section className="page page-enter">
      <div className="page-head">
        <div>
          <p className="kicker">GALLERY</p>
          <h1>图库</h1>
          <p className="page-sub">原图保持原尺寸，图库只展示你裁切保存的 4:3 / 3:4 封面。</p>
        </div>
        <div className="page-stat">
          {filterSkillId === 'all' ? (
            <><strong>{results.length}</strong><span>个本地结果</span></>
          ) : (
            <><strong>{filteredResults.length}</strong><span>张 / 共 {results.length} 张</span></>
          )}
        </div>
      </div>
      <div className="result-toolbar">
        <label className="result-filter"><span>分类筛选</span><select value={filterSkillId} onChange={(event) => setFilterSkillId(event.target.value)}><option value="all">全部风格</option>{filterOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
        <span className="result-sort-note">按生成时间倒序</span>
      </div>
      {!filteredResults.length && <div className="empty-hint">还没有符合条件的结果。</div>}
      <div className="result-grid">
        {columns.map((column, index) => (
          <div className="result-column" key={`result-column-${index}`}>
            {column.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                onView={onView}
                onAgain={onAgain}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function ResultCard({ result: r, onView, onAgain, onDownload, onDelete }) {
  return (
    <article className="result-card">
      <div className={`result-thumb result-thumb-${r.coverRatio === '3:4' ? 'portrait' : 'landscape'}`}>
        {r.image ? <img src={r.image} alt={r.title} style={{ objectPosition: `${r.coverPosition?.x ?? 50}% ${r.coverPosition?.y ?? 50}%` }} /> : (
          <div className="result-art"><span>占位结果</span><strong>{r.styleName}</strong></div>
        )}
        <span className="result-ratio">封面 {r.coverRatio || '待设置'}</span>
      </div>
      <div className="result-actions">
        <button onClick={() => onView(r)}>查看</button>
        <button onClick={() => onAgain(r)}>再次生成</button>
        <button onClick={() => onDownload(r)}>下载</button>
        <button className="result-delete" onClick={() => onDelete(r)}>删除</button>
      </div>
    </article>
  )
}

function distributeResults(results, columnCount) {
  const columns = Array.from({ length: columnCount }, () => ({ items: [], height: 0 }))
  results.forEach((result) => {
    const firstEmpty = columns.findIndex((column) => column.items.length === 0)
    const target = firstEmpty >= 0
      ? firstEmpty
      : columns.reduce((shortest, column, index) => column.height < columns[shortest].height ? index : shortest, 0)
    columns[target].items.push(result)
    columns[target].height += result.coverRatio === '3:4' ? 1.36 : 1
  })
  return columns.map((column) => column.items)
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function SettingsPanel({ onClose }) {
  const [health, setHealth] = useState(null)
  const [storage, setStorage] = useState(null)
  const [error, setError] = useState('')
  const [savingExecutor, setSavingExecutor] = useState(false)
  const desktop = window.styleShelfDesktop

  useEffect(() => {
    loadHealth().then(setHealth).catch((loadError) => setError(loadError.message || '本地服务不可用'))
    loadStorage().then(setStorage).catch(() => {})
  }, [])

  async function selectExecutor(id) {
    setSavingExecutor(true)
    setError('')
    try {
      const executor = await configureExecutor(id)
      setHealth((current) => current ? { ...current, executor } : current)
    } catch (saveError) {
      setError(saveError.message || '执行器配置保存失败')
    } finally {
      setSavingExecutor(false)
    }
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-head">
          <div><p className="kicker">LOCAL DIAGNOSTICS</p><h2 id="settings-title">本地诊断</h2><p>这里显示工作台与本地服务的连接状态，不保存模型密钥。</p></div>
          <button className="workshop-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="settings-grid">
          <div className="settings-row"><span>本地 API</span><strong className={health ? 'settings-ok' : error ? 'settings-fail' : ''}>{health ? '已连接' : error ? '未连接' : '检查中…'}</strong></div>
          <div className="settings-row"><span>数据目录</span><code>{health?.dataDir || '启动本地服务后显示'}</code></div>
          <div className="settings-row"><span>图片库目录</span><div className="settings-path-line"><code>{storage?.libraryDir || '启动本地服务后显示'}</code>{desktop && <button className="settings-open-button" onClick={() => desktop.openLibrary()}>打开</button>}</div></div>
          <div className="settings-row"><span>上传图片</span><div className="settings-path-line"><code>{storage ? `${storage.uploads.files} 个 · ${formatBytes(storage.uploads.bytes)} · ${storage.uploads.path}` : '检查中…'}</code>{desktop && <button className="settings-open-button" onClick={() => desktop.openUploads()}>打开</button>}</div></div>
          <div className="settings-row"><span>生成图片</span><div className="settings-path-line"><code>{storage ? `${storage.generated.files} 个 · ${formatBytes(storage.generated.bytes)} · ${storage.generated.path}` : '检查中…'}</code>{desktop && <button className="settings-open-button" onClick={() => desktop.openGenerated()}>打开</button>}</div></div>
          <div className="settings-row settings-executor-row"><span>执行器配置</span><div className="executor-choice"><div className="executor-choice-buttons" role="group" aria-label="选择执行器">
            {['codex', 'workbuddy'].map((id) => <button key={id} type="button" className={health?.executor?.id === id || (id === 'codex' && health?.executor?.id === 'codex-runner') ? 'executor-choice-button active' : 'executor-choice-button'} disabled={savingExecutor} onClick={() => selectExecutor(id)}>{id === 'codex' ? 'Codex' : 'WorkBuddy'}</button>)}
          </div><small>{health?.executor ? `${health.executor.label} · ${health.executor.state === 'missing_token' ? '未配置连接凭据' : '已配置'}` : '检查中…'}</small></div></div>
          <div className="settings-row"><span>生图接口</span><strong className={health?.executor?.imageProvider?.state === 'external_config_required' ? 'settings-pending' : 'settings-ok'}>{health?.executor?.imageProvider?.label || '由 Codex 提供'}</strong></div>
          <div className="settings-row"><span>端口覆盖</span><code>STYLE_SHELF_PORT / STYLE_SHELF_FRONTEND_PORT</code></div>
        </div>
        {error && <p className="settings-error" role="alert">{error}。请先在仓库目录运行 `npm run start`。</p>}
        <div className="settings-note"><strong>凭据边界</strong><p>模型登录、API 密钥和本机 Skill 文件都留在你的环境中；工作台只保存目录索引、Job 状态和结果文件引用。</p></div>
      </section>
    </div>
  )
}

function SkillWorkshop({ skills, onClose, onRefresh }) {
  const [source, setSource] = useState('')
  const [installing, setInstalling] = useState(false)
  const [localQuery, setLocalQuery] = useState('')
  const [localSkills, setLocalSkills] = useState([])
  const [selectedLocalIds, setSelectedLocalIds] = useState([])
  const [importingLocal, setImportingLocal] = useState(false)
  const [error, setError] = useState('')
  const [deletedSkills, setDeletedSkills] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => { loadDeletedSkills().then(setDeletedSkills).catch(() => {}) }, [])
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => loadLocalSkills(localQuery).then((items) => active && setLocalSkills(items)).catch(() => active && setLocalSkills([])), 120)
    return () => { active = false; clearTimeout(timer) }
  }, [localQuery])

  async function submit(event) {
    event.preventDefault()
    setInstalling(true)
    setError('')
    try {
      await installSkill(source)
      await onRefresh()
      setSource('')
    } catch (submitError) {
      setError(submitError.message || 'Skill 保存失败')
    } finally {
      setInstalling(false)
    }
  }

  function toggleLocalSkill(skill) {
    if (skill.inCatalog) return
    setSelectedLocalIds((ids) => ids.includes(skill.id) ? ids.filter((id) => id !== skill.id) : [...ids, skill.id])
  }

  async function importLocalSkills() {
    if (!selectedLocalIds.length) return
    setImportingLocal(true)
    setError('')
    try {
      for (const id of selectedLocalIds) await installSkill(id)
      await onRefresh()
      setSelectedLocalIds([])
      setLocalSkills(await loadLocalSkills(localQuery))
    } catch (importError) {
      await onRefresh().catch(() => {})
      await loadLocalSkills(localQuery).then(setLocalSkills).catch(() => {})
      setError(importError.message || '本地 Skill 导入失败')
    } finally {
      setImportingLocal(false)
    }
  }

  async function performRemove(skill) {
    try {
      await deleteSkill(skill.id)
      await onRefresh()
      setDeletedSkills(await loadDeletedSkills())
    } catch (deleteError) {
      setError(deleteError.message || 'Skill 移出失败')
    }
  }

  function remove(skill) {
    setConfirmState({
      title: '移出工作台',
      message: `从风格仓库移出「${skill.name}」？不会删除本机 Codex Skill，历史结果也不会被删除。`,
      confirmLabel: '移出工作台',
      onConfirm: async () => { setConfirmState(null); await performRemove(skill) },
    })
  }

  async function restore(skill) {
    try {
      await restoreSkill(skill.id)
      await onRefresh()
      setDeletedSkills(await loadDeletedSkills())
    } catch (restoreError) {
      setError(restoreError.message || 'Skill 恢复失败')
    }
  }

  return (
    <>
      <div className="workshop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
        <section className="workshop-panel" role="dialog" aria-modal="true" aria-labelledby="workshop-title">
        <div className="workshop-head">
          <div><p className="kicker">SKILL WORKSHOP</p><h2 id="workshop-title">管理风格目录</h2><p>这里只管理工作台的调用清单；移出不会删除本机 Codex Skill，历史 Job 和结果也不会被删除。</p></div>
          <button className="workshop-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="workshop-grid">
          <div className="workshop-list">
            {skills.map((skill) => (
              <div className="workshop-item" key={skill.id}>
                <div><strong>{skill.name}</strong><small>{skill.id} · {formatSkillVersion(skill.version)}</small></div>
                <div className="workshop-item-actions"><button onClick={() => setSource(skill.id)}>重装</button><button onClick={() => remove(skill)}>移出工作台</button></div>
              </div>
            ))}
            {deletedSkills.length > 0 && <div className="workshop-trash"><p>最近移出工作台</p>{deletedSkills.map((skill) => <div className="workshop-item" key={skill.id}><div><strong>{skill.name}</strong><small>{skill.id}</small></div><button onClick={() => restore(skill)}>恢复调用</button></div>)}</div>}
          </div>
          <form className="workshop-form" onSubmit={submit}>
            <div className="workshop-form-head"><strong>从本机导入 Skill</strong><span className="install-badge">LOCAL CODEX</span></div>
            <p className="workshop-install-copy">检索你本机 Codex 已安装的 Skill，勾选后加入风格仓库。如果这里没有你想要的 Skill，可以先让 Codex 完成安装，再回到这里检索添加。工作台不会移动或复制原始 Skill 文件，只会读取它的 `SKILL.md` 生成风格卡片。</p>
            <label className="field"><span>检索本地 Skill</span><input value={localQuery} onChange={(event) => setLocalQuery(event.target.value)} placeholder="输入名称或关键词" /></label>
            <div className="local-skill-list" aria-live="polite">
              {localSkills.length ? localSkills.map((skill) => (
                <button type="button" className={`local-skill-row ${selectedLocalIds.includes(skill.id) ? 'is-selected' : ''} ${skill.inCatalog ? 'is-imported' : ''}`} key={skill.id} onClick={() => toggleLocalSkill(skill)} disabled={skill.inCatalog}>
                  <span className="local-skill-check" aria-hidden="true">{skill.inCatalog ? '✓' : selectedLocalIds.includes(skill.id) ? '✓' : ''}</span>
                  <span className="local-skill-copy"><strong>{skill.name}</strong><small>{skill.id}</small></span>
                  <span className="skill-tag local-skill-state">{skill.inCatalog ? '已加入' : skill.modeLabel}</span>
                </button>
              )) : <p className="local-skill-empty">没有找到可导入的本地 Skill</p>}
            </div>
            <button className="run workshop-save" type="button" onClick={importLocalSkills} disabled={importingLocal || selectedLocalIds.length === 0}>{importingLocal ? '正在导入并读取 SKILL.md…' : `导入已选 Skill${selectedLocalIds.length ? `（${selectedLocalIds.length}）` : ''}`}</button>
            <div className="workshop-divider"><span>或从仓库安装</span></div>
            <div className="workshop-form-head"><strong>安装远程 Skill</strong><span className="install-badge">CODEX INSTALLER</span></div>
            <p className="workshop-install-copy">输入 GitHub 仓库地址、Skill 文件夹地址，或已经存在的 Skill 名称。安装器会复制到本机 Codex Skills 目录，并读取 `SKILL.md` 自动生成风格卡片。</p>
            <label className="field"><span>仓库地址 / Skill 名称</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://github.com/owner/repo/tree/main/path 或 skill-name" required /></label>
            <div className="workshop-source-hints"><span>支持 GitHub URL</span><span>支持已安装 / curated Skill 名称</span></div>
            {error && <p className="workshop-error" role="alert">{error}</p>}
            <button className="run workshop-save" type="submit" disabled={installing}>{installing ? '正在安装并读取 SKILL.md…' : '安装并加入风格仓库'}</button>
          </form>
        </div>
        </section>
      </div>
      {confirmState && <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(null)} />}
    </>
  )
}

/* ---------------- 右侧上下文栏 ---------------- */

function ContextRail({ skills, tasks, results, draftTaskId, onAnswer, onCancel, onRetry, onOpenTaskResult, onViewResults, onOpenWorkshop }) {
  const [showAllTasks, setShowAllTasks] = useState(false)
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 3)

  return (
    <aside className="rail">
      <section className="rail-block" id="task-progress">
        <div className="rail-head">
          <h2>任务进度</h2>
          <span>{tasks.length ? `${tasks.length} 个任务` : '空闲'}</span>
        </div>
        {tasks.length === 0 ? (
          <div className="rail-empty">
            <strong>还没有后台任务</strong>
            <p>从风格卡片提交一次生成，进度会一直显示在这里，离开工作区也不中断。</p>
          </div>
        ) : (
          <>
            <div className={`task-list ${showAllTasks ? 'is-expanded' : ''}`}>
              {visibleTasks.map((t) => (
                <div key={t.id} data-task-id={t.id} className={`task state-${t.state}`}>
                  <div className="task-title">
                    <strong>{t.name}</strong>
                    <span className="task-state">{TASK_STATE_LABEL[t.state]}{t.state === 'running' ? ` ${t.progress}%` : ''}</span>
                  </div>
                  <div className="task-bar"><span style={{ width: `${t.progress}%` }} /></div>
                  <p>{t.message}</p>
                  {t.state === 'waiting_input' && <button className="task-action" onClick={() => onAnswer(t.id)}>回答问题 ↗</button>}
                  {['queued', 'running', 'waiting_input'].includes(t.state) && <button className="task-action task-action-muted" onClick={() => onCancel(t.id)}>取消任务</button>}
                  {t.state === 'failed' && <button className="task-action" onClick={() => onRetry(t.id)}>重试 ↻</button>}
                  {t.state === 'completed' && (t.result
                    ? <button className="task-action" onClick={() => onOpenTaskResult(t)}>{t.id === draftTaskId ? '继续处理这次成果 ↗' : '查看这次成果 ↗'}</button>
                    : <button className="task-action" onClick={onViewResults}>打开图库 ↗</button>)}
                </div>
              ))}
            </div>
            {tasks.length > 3 && (
              <button
                className={`task-list-toggle ${showAllTasks ? 'is-expanded' : ''}`}
                type="button"
                aria-expanded={showAllTasks}
                onClick={() => setShowAllTasks((current) => !current)}
              >
                <span>{showAllTasks ? '收起任务' : `查看全部任务（还有 ${tasks.length - 3} 个）`}</span>
                <span aria-hidden="true">⌄</span>
              </button>
            )}
          </>
        )}
      </section>

      <section className="rail-block">
        <div className="rail-head">
          <h2>最近结果</h2>
          <button onClick={onViewResults}>查看全部</button>
        </div>
        <div className="mini-results">
          {results.slice(0, 2).map((r) => (
            <button key={r.id} className="mini-result" onClick={onViewResults}>
              {r.image ? <img src={r.image} alt={r.title} /> : <span className="mini-art" />}
              <span className="mini-text"><strong>{r.title}</strong><small>{r.styleName}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="rail-block">
        <div className="rail-head"><h2>Skill 管理</h2></div>
        <div className="skill-status-list">
          {skills.map((s) => (
            <div key={s.id} className="skill-status">
              <span className="skill-status-name">{s.name}</span>
              <span className="skill-tag skill-status-tag">{s.installed === false ? '需先安装' : s.ready ? '已接入' : '待补素材'}</span>
            </div>
          ))}
        </div>
        <button className="workshop-btn" onClick={onOpenWorkshop}>打开 Skill Workshop <span>↗</span></button>
      </section>
    </aside>
  )
}

createRoot(document.getElementById('root')).render(<App />)
