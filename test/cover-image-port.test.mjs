import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('Skill and Prompt covers survive restarts and save without a port', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-cover-port-'))
  process.env.STYLE_SHELF_DATA_DIR = root
  process.env.STYLE_SHELF_PORT = '62003'
  t.after(() => rm(root, { recursive: true, force: true }))
  const skills = await import('../server/skills.mjs')
  const prompts = await import('../server/prompts.mjs')
  assert.deepEqual(await skills.listSkills(), [])
  const skill = { id: 'test-skill', name: 'Test', english: 'TEST', desc: '', mode: 'text', modeLabel: 'Text', scenes: [], version: 'local', inputSchema: [] }
  await skills.createSkill(skill)
  const prompt = await prompts.createPrompt({ name: 'Cover test', template: 'Draw a lake', mode: 'text' })
  const path = '/api/jobs/sample/output/result-01.png'
  const cover = `http://127.0.0.1:63963${path}`
  await skills.updateSkill(skill.id, { cover, samples: [cover], coverStatus: 'generated' })
  await prompts.updatePrompt(prompt.id, { cover })
  for (const file of ['skills.json', 'prompts.json']) {
    const saved = JSON.parse(await readFile(join(root, file), 'utf8'))
    assert.equal(saved.find((item) => item.id === (file === 'skills.json' ? skill.id : prompt.id)).cover, path)
  }
  for (const port of ['62003', '62004']) {
    process.env.STYLE_SHELF_PORT = port
    const current = (await skills.listSkills()).find((item) => item.id === skill.id)
    assert.equal(current.cover, `http://127.0.0.1:${port}${path}`)
    assert.deepEqual(current.samples, [current.cover])
    assert.equal((await prompts.getPrompt(prompt.id)).cover, current.cover)
  }
})
