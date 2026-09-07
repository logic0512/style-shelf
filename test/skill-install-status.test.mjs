import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function run(root, script) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, STYLE_SHELF_DATA_DIR: join(root, 'data'), STYLE_SHELF_LIBRARY_DIR: join(root, 'library'), CODEX_HOME: join(root, 'codex') },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const [code] = await once(child, 'exit')
  return { code, stdout, stderr }
}

test('catalog marks a local Skill unavailable after its SKILL.md disappears', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-skill-status-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const skillDir = join(root, 'codex', 'skills', 'local-test')
  await mkdir(skillDir, { recursive: true })
  await writeFile(join(skillDir, 'SKILL.md'), '# local test\n')
  const skillsModule = new URL('../server/skills.mjs', import.meta.url).href
  const script = `
    import { rm } from 'node:fs/promises';
    const skills = await import(${JSON.stringify(skillsModule)});
    await skills.createSkill({ id: 'local-test', name: 'Local', english: 'LOCAL', desc: 'test', mode: 'text', modeLabel: '文字生图', scenes: [], version: 'local', works: 0, ready: false, coverStatus: 'needs_sample', coverSource: 'none', coverFrameRatio: '4:5', cover: null, inputSchema: [{ id: 'direction', type: 'textarea', label: 'Input', required: true }] });
    await rm(${JSON.stringify(skillDir)}, { recursive: true, force: true });
    console.log(JSON.stringify(await skills.listSkills()));
  `
  const result = await run(root, script)
  assert.equal(result.code, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout)[0].installed, false)
})

test('remote installation reports a missing installer dependency', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-installer-status-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const installerModule = new URL('../server/skill-installer.mjs', import.meta.url).href
  const script = `
    const installer = await import(${JSON.stringify(installerModule)});
    let message = '';
    try { await installer.installSkill('https://github.com/openai/skills/tree/main/skills/.curated/pdf'); } catch (error) { message = error.message; }
    console.log(message);
  `
  const result = await run(root, script)
  assert.equal(result.code, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'skill_installer_unavailable')
})

test('installer health keeps GitHub URL installation available without name lookup', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-installer-health-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const scripts = join(root, 'codex', 'skills', '.system', 'skill-installer', 'scripts')
  await mkdir(scripts, { recursive: true })
  await writeFile(join(scripts, 'install-skill-from-github.py'), '# test\n')
  const installerModule = new URL('../server/skill-installer.mjs', import.meta.url).href
  const result = await run(root, `
    const installer = await import(${JSON.stringify(installerModule)});
    console.log(JSON.stringify(await installer.describeSkillInstaller()));
  `)
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { state: 'ready', message: 'GitHub URL installation available; name lookup unavailable', nameLookup: false })
})

test('remote Skill URLs reject embedded credentials before invoking installers', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-installer-url-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const installerModule = new URL('../server/skill-installer.mjs', import.meta.url).href
  const script = `
    const installer = await import(${JSON.stringify(installerModule)});
    let message = '';
    try { await installer.installSkill('https://user:secret@github.com/openai/skills/tree/main/skills/.curated/pdf'); } catch (error) { message = error.message; }
    console.log(message);
  `
  const result = await run(root, script)
  assert.equal(result.code, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'invalid_github_source')
})

test('required question fields need usable non-empty questions', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-question-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const skillsModule = new URL('../server/skills.mjs', import.meta.url).href
  const script = `
    const skills = await import(${JSON.stringify(skillsModule)});
    let message = '';
    try { await skills.createSkill({ id: 'bad-questions', name: 'Bad', english: 'BAD', desc: 'test', mode: 'guided', modeLabel: '问答', scenes: [], version: 'local', works: 0, ready: false, coverStatus: 'needs_sample', coverSource: 'none', coverFrameRatio: '4:5', cover: null, inputSchema: [{ id: 'questions', type: 'questions', label: 'Questions', required: true, questions: [] }] }); } catch (error) { message = error.message; }
    console.log(message);
  `
  const result = await run(root, script)
  assert.equal(result.code, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'invalid_skill_manifest')
})
