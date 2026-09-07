import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('cover display mode is optional, persists, and rejects invalid values', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-cover-'))
  process.env.STYLE_SHELF_DATA_DIR = root
  t.after(() => rm(root, { recursive: true, force: true }))
  const { listSkills, updateSkill, createSkill } = await import('../server/skills.mjs')
  assert.deepEqual(await listSkills(), [])
  const skill = { id: 'test-skill', name: 'Test', english: 'TEST', desc: '', mode: 'text', modeLabel: 'Text', scenes: [], version: 'local', inputSchema: [] }
  await createSkill(skill)
  for (const coverFit of ['cover', 'contain']) {
    await updateSkill(skill.id, { coverFit })
    assert.equal((await listSkills()).find((item) => item.id === skill.id).coverFit, coverFit)
  }
  await assert.rejects(updateSkill(skill.id, { coverFit: 'stretch' }), /invalid_skill_manifest/)
  assert.equal((await listSkills()).find((item) => item.id === skill.id).coverFit, 'contain')
  const { createPrompt, updatePrompt, getPrompt } = await import('../server/prompts.mjs')
  const prompt = await createPrompt({ name: 'Cover modes', template: 'Draw a lake', mode: 'text' })
  for (const coverFit of ['cover', 'contain']) {
    await updatePrompt(prompt.id, { coverFit })
    assert.equal((await getPrompt(prompt.id)).coverFit, coverFit)
  }
  await assert.rejects(updatePrompt(prompt.id, { coverFit: 'stretch' }), /invalid_prompt/)
  assert.equal((await getPrompt(prompt.id)).coverFit, 'contain')
  const file = join(root, 'skills.json')
  for (const damaged of ['[{"id":"broken"}]', '{broken json', '{}']) {
    await writeFile(file, damaged)
    await assert.rejects(listSkills(), /invalid_skills_store/)
    await assert.rejects(updateSkill(skill.id, { name: 'Do not overwrite' }), /invalid_skills_store/)
    assert.equal(await readFile(file, 'utf8'), damaged)
  }
})
