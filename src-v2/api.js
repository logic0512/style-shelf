const API_BASE = globalThis.styleShelfDesktop?.apiBase || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4317'

export async function loadSkillCatalog() {
  try {
    const payload = await request('/api/skills')
    if (Array.isArray(payload.skills)) return payload.skills.filter(validSkill)
  } catch {}
  const response = await fetch('/skill-catalog.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`skill_catalog_${response.status}`)
  const skills = await response.json()
  return Array.isArray(skills) ? skills.filter(validSkill) : []
}

function validSkill(skill) {
  return Boolean(
    skill && typeof skill.id === 'string' && typeof skill.name === 'string' &&
    typeof skill.modeLabel === 'string' && Array.isArray(skill.scenes) &&
    Array.isArray(skill.inputSchema)
  )
}

export async function createSkill(skill) {
  return request('/api/skills', { method: 'POST', body: JSON.stringify(skill) })
}

export async function updateSkill(skillId, patch) {
  return request(`/api/skills/${encodeURIComponent(skillId)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deleteSkill(skillId) {
  return request(`/api/skills/${encodeURIComponent(skillId)}`, { method: 'DELETE' })
}

export async function loadPromptCatalog() {
  const payload = await request('/api/prompts')
  return Array.isArray(payload.prompts) ? payload.prompts : []
}

export async function createPrompt(prompt) {
  return request('/api/prompts', { method: 'POST', body: JSON.stringify(prompt) })
}

export async function updatePrompt(promptId, patch) {
  return request(`/api/prompts/${encodeURIComponent(promptId)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deletePrompt(promptId) {
  return request(`/api/prompts/${encodeURIComponent(promptId)}`, { method: 'DELETE' })
}

export async function loadDeletedSkills() {
  const payload = await request('/api/skills/trash')
  return Array.isArray(payload.skills) ? payload.skills : []
}

export async function restoreSkill(skillId) {
  return request(`/api/skills/${encodeURIComponent(skillId)}/restore`, { method: 'POST', body: '{}' })
}

export async function installSkill(source) {
  return request('/api/skills/install', { method: 'POST', body: JSON.stringify({ source }) })
}

export async function loadLocalSkills(query = '') {
  const payload = await request(`/api/skills/local?q=${encodeURIComponent(query)}`)
  return Array.isArray(payload.skills) ? payload.skills : []
}

export function loadHealth() {
  return request('/api/health')
}

export async function configureExecutor(id) {
  const payload = await request('/api/executor', { method: 'POST', body: JSON.stringify({ id }) })
  return payload.executor || null
}

export async function loadStorage() {
  const payload = await request('/api/storage')
  return payload.storage || null
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  })
  if (!response.ok) throw new Error(`local_api_${response.status}`)
  return response.json()
}

export async function loadPersistedResults() {
  const payload = await request('/api/results')
  return Array.isArray(payload.results) ? payload.results : []
}

export async function seedResults(results) {
  await request('/api/results', { method: 'PUT', body: JSON.stringify({ results }) })
}

export async function saveResult(result) {
  return request('/api/results', { method: 'POST', body: JSON.stringify(result) })
}

export async function deleteResult(resultId) {
  return request(`/api/results/${encodeURIComponent(resultId)}`, { method: 'DELETE' })
}

export async function createJob(job) {
  return request('/api/jobs', { method: 'POST', body: JSON.stringify(job) })
}

export async function loadJobs() {
  const payload = await request('/api/jobs')
  return Array.isArray(payload.jobs) ? payload.jobs : []
}

export async function updateJob(jobId, state, message, progress) {
  return request(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ state, message, progress }),
  })
}

export async function uploadJobInput(jobId, file, filename = file.name, fieldId = '', turnId = '') {
  const params = new URLSearchParams({ filename })
  if (fieldId) params.set('fieldId', fieldId)
  if (turnId) params.set('turnId', turnId)
  return request(`/api/jobs/${encodeURIComponent(jobId)}/input?${params.toString()}`, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  })
}

export async function runJob(jobId) {
  return request(`/api/jobs/${encodeURIComponent(jobId)}/run`, { method: 'POST', body: '{}' })
}

export async function continueJob(jobId, payload, parentArtifactFilename = '') {
  return request(`/api/jobs/${encodeURIComponent(jobId)}/continue`, { method: 'POST', body: JSON.stringify({ payload, parentArtifactFilename }) })
}

export async function cancelJob(jobId) {
  return request(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', body: '{}' })
}

export async function loadJob(jobId) {
  return request(`/api/jobs/${encodeURIComponent(jobId)}`)
}

export function jobArtifactUrl(jobId, filename) {
  return `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/output/${encodeURIComponent(filename)}`
}

export function jobInputUrl(jobId, filename) {
  return `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/input/${encodeURIComponent(filename)}`
}
