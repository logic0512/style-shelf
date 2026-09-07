import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const jobsModule = new URL('../server/jobs.mjs', import.meta.url).href
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64')

async function runIsolated(script) {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-reliability-'))
  try {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, STYLE_SHELF_DATA_DIR: join(root, 'data'), STYLE_SHELF_LIBRARY_DIR: join(root, 'library') },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    const [code] = await once(child, 'exit')
    return { root, code, stdout, stderr }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

test('duplicate job ids are rejected without changing the original job', async (t) => {
  const script = `
    const jobs = await import(${JSON.stringify(jobsModule)});
    const first = await jobs.createJob({ id: 'same', promptId: 'original', payload: { marker: 'keep' } });
    let duplicateError = '';
    try { await jobs.createJob({ id: 'same', promptId: 'replacement', payload: {} }); } catch (error) { duplicateError = error.message; }
    const current = await jobs.readJob('same');
    console.log(JSON.stringify({ duplicateError, promptId: current.promptId, marker: current.payload.marker }));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { duplicateError: 'job_already_exists', promptId: 'original', marker: 'keep' })
})

test('a corrupt job record does not prevent valid jobs from loading', async (t) => {
  const script = `
    import { mkdir, writeFile } from 'node:fs/promises';
    import { join } from 'node:path';
    const jobs = await import(${JSON.stringify(jobsModule)});
    await jobs.createJob({ id: 'valid', promptId: 'prompt', payload: {} });
    const corruptDir = join(process.env.STYLE_SHELF_DATA_DIR, 'jobs', 'corrupt');
    await mkdir(corruptDir, { recursive: true });
    await writeFile(join(corruptDir, 'job.json'), '{', 'utf8');
    const listed = await jobs.listJobs();
    console.log(JSON.stringify(listed.map((job) => job.id)));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), ['valid'])
  assert.match(result.stderr, /corrupt/)
})

test('legacy migration skips a corrupt job record and completes startup migration', async (t) => {
  const storageModule = new URL('../server/storage.mjs', import.meta.url).href
  const script = `
    import { mkdir, writeFile } from 'node:fs/promises';
    import { join } from 'node:path';
    const storage = await import(${JSON.stringify(storageModule)});
    const corruptDir = join(process.env.STYLE_SHELF_DATA_DIR, 'jobs', 'corrupt');
    await mkdir(corruptDir, { recursive: true });
    await writeFile(join(corruptDir, 'job.json'), '{', 'utf8');
    const result = await storage.migrateLegacyStorage();
    console.log(JSON.stringify(result));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).version, 1)
  assert.match(result.stderr, /corrupt/)
})

test('saving an artifact skips an orphaned result filename without overwriting it', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-artifact-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const script = `
    import { mkdir, readFile, writeFile } from 'node:fs/promises';
    import { join } from 'node:path';
    const jobs = await import(${JSON.stringify(jobsModule)});
    const job = await jobs.createJob({ id: 'artifact', promptId: 'prompt', payload: {} });
    await mkdir(job.outputDir, { recursive: true });
    const source = join(job.outputDir, 'source.png');
    await writeFile(source, Buffer.from(${JSON.stringify(pixel.toString('base64'))}, 'base64'));
    const generated = join(process.env.STYLE_SHELF_LIBRARY_DIR, 'Generated', job.id);
    await mkdir(generated, { recursive: true });
    await writeFile(join(generated, 'result-01.png'), Buffer.from('KEEP'));
    const savedJob = await jobs.saveJobArtifact(job.id, source, 'image/png');
    console.log(JSON.stringify({ filename: savedJob.artifacts[0].filename, orphan: (await readFile(join(generated, 'result-01.png'))).toString() }));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { filename: 'result-02.png', orphan: 'KEEP' })
})

test('a failed execution preflight persists the Job as failed', async (t) => {
  const executorModule = new URL('../server/executor.mjs', import.meta.url).href
  const script = `
    const jobs = await import(${JSON.stringify(jobsModule)});
    const executor = await import(${JSON.stringify(executorModule)});
    await jobs.createJob({ id: 'missing-source', skillId: 'missing-skill', payload: {} });
    let message = '';
    try { await executor.startJobRun('missing-source'); } catch (error) { message = error.message; }
    const job = await jobs.readJob('missing-source');
    console.log(JSON.stringify({ message, state: job.state, activeTurnId: job.activeTurnId, turnState: job.turns[0].state }));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { message: 'skill_not_found', state: 'failed', activeTurnId: null, turnState: 'failed' })
})

test('execution preflight never rewrites a completed Job', async (t) => {
  const executorModule = new URL('../server/executor.mjs', import.meta.url).href
  const script = `
    const jobs = await import(${JSON.stringify(jobsModule)});
    const executor = await import(${JSON.stringify(executorModule)});
    await jobs.createJob({ id: 'completed-source-gone', skillId: 'missing-skill', payload: {} });
    await jobs.updateJob('completed-source-gone', { state: 'completed', activeTurnId: null, turns: [{ id: 'turn-01', state: 'completed' }] });
    const result = await executor.startJobRun('completed-source-gone');
    console.log(JSON.stringify({ state: result.state, turnState: result.turns[0].state }));
  `
  const result = await runIsolated(script)
  t.after(() => rm(result.root, { recursive: true, force: true }))
  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { state: 'completed', turnState: 'completed' })
})
