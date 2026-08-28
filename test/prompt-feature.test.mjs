import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('prompt store and job source contract', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-prompt-'))
  process.env.STYLE_SHELF_DATA_DIR = join(root, 'data')
  process.env.STYLE_SHELF_LIBRARY_DIR = join(root, 'library')
  t.after(() => rm(root, { recursive: true, force: true }))

  const prompts = await import(`../server/prompts.mjs?test=${Date.now()}`)
  const jobs = await import(`../server/jobs.mjs?test=${Date.now()}`)

  const imagePrompt = await prompts.createPrompt({ name: '三色印章', summary: '把照片转成三色印章。', template: '保留主体轮廓，使用三色印章和大量留白。', mode: 'image' })
  assert.equal(imagePrompt.inputSchema[0].type, 'image')
  assert.equal(imagePrompt.inputSchema[0].required, true)

  const textPrompt = await prompts.createPrompt({ name: '复古几何版画', template: '使用低饱和几何色块和印刷颗粒。', mode: 'text' })
  assert.equal(textPrompt.inputSchema[0].type, 'textarea')
  assert.equal(textPrompt.inputSchema[0].required, true)

  const job = await jobs.createJob({ id: 'prompt-job', promptId: imagePrompt.id, payload: {} })
  assert.equal(job.promptId, imagePrompt.id)
  assert.equal('skillId' in job, false)

  await assert.rejects(jobs.createJob({ id: 'double-source', skillId: 'skill-a', promptId: imagePrompt.id, payload: {} }), /invalid_job_source/)
  await prompts.deletePrompt(textPrompt.id)
  assert.equal((await prompts.listPrompts()).length, 3)

  const promptsFile = join(root, 'data', 'prompts.json')
  await writeFile(promptsFile, '[{"id":"broken"}]\n', 'utf8')
  const damaged = await readFile(promptsFile, 'utf8')
  await assert.rejects(prompts.listPrompts(), /invalid_prompts_store/)
  await assert.rejects(prompts.createPrompt({ name: '不能覆盖', template: '不能覆盖损坏的数据。', mode: 'text' }), /invalid_prompts_store/)
  assert.equal(await readFile(promptsFile, 'utf8'), damaged)
})

test('prompt execution combines fixed style with current input', async () => {
  const { buildPromptExecution } = await import('../server/prompt-execution.mjs')
  const text = buildPromptExecution({
    id: 'prompt-job',
    promptId: 'prompt-a',
    payload: { text: '把背景改成冷蓝色', fields: { direction: '保留桥梁', continuationPrompt: '把背景改成冷蓝色', ratio: '4:3' } },
    inputs: [{ filename: 'source.png', path: '/safe/source.png' }],
    turns: [{ id: 'turn-01', index: 1, inputFilenames: ['source.png'] }],
    activeTurnId: 'turn-01',
    outputDir: '/safe/output',
  }, { id: 'prompt-a', name: '三色印章', mode: 'image', template: '使用三色印章和大量留白。' })

  assert.match(text, /使用三色印章和大量留白/)
  assert.match(text, /把背景改成冷蓝色/)
  assert.match(text, /\/safe\/source\.png/)
  assert.match(text, /4:3/)
})

test('image Prompt cannot run before its source image is registered', async () => {
  const { buildPromptExecution } = await import('../server/prompt-execution.mjs')
  assert.throws(() => buildPromptExecution({
    id: 'prompt-without-image',
    promptId: 'prompt-a',
    payload: { fields: { direction: '', ratio: '4:3' } },
    inputs: [],
    turns: [{ id: 'turn-01', index: 1, inputFilenames: [] }],
    activeTurnId: 'turn-01',
    outputDir: '/safe/output',
  }, { id: 'prompt-a', name: '三色印章', mode: 'image', template: '使用三色印章。' }), /prompt_image_required/)
})

test('text Prompt cannot run without current content', async () => {
  const { buildPromptExecution } = await import('../server/prompt-execution.mjs')
  assert.throws(() => buildPromptExecution({
    id: 'prompt-without-text',
    promptId: 'prompt-b',
    payload: { fields: { direction: '', ratio: '4:3' } },
    inputs: [],
    turns: [{ id: 'turn-01', index: 1, inputFilenames: [] }],
    activeTurnId: 'turn-01',
    outputDir: '/safe/output',
  }, { id: 'prompt-b', name: '复古版画', mode: 'text', template: '使用复古版画风格。' }), /prompt_text_required/)
})
