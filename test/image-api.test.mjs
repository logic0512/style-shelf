import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII='

test('real API publishes relative image paths and serves them after a port change', { timeout: 30000 }, async (t) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'styleshelf-image-api-')))
  const children = new Set()
  async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    const timeout = setTimeout(() => child.kill('SIGKILL'), 1000)
    try { await exited } finally { clearTimeout(timeout) }
  }
  t.after(async () => {
    await Promise.all([...children].map(stop))
    await rm(root, { recursive: true, force: true })
  })
  const localAssets = join(root, 'data', 'skill-assets', 'custom')
  const webRoot = join(root, 'distribution')
  await mkdir(localAssets, { recursive: true })
  await mkdir(join(webRoot, 'skill-assets'), { recursive: true })
  await writeFile(join(localAssets, 'cover.png'), Buffer.from(png, 'base64'))
  await writeFile(join(webRoot, 'skill-assets', 'bundled.png'), Buffer.from(png, 'base64'))
  const privateFile = join(root, 'private.txt')
  await writeFile(privateFile, 'private file must not be served')
  let checkSymlink = true
  try {
    await symlink(privateFile, join(localAssets, 'escape.png'))
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error
    checkSymlink = false
    t.diagnostic('Symlink check unavailable: Windows account lacks symlink permission; image checks still run.')
  }
  async function start(previousPort) {
    let port
    do {
      const reservation = createServer()
      reservation.listen(0, '127.0.0.1')
      await once(reservation, 'listening')
      port = reservation.address().port
      await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()))
    } while (port === previousPort)
    const setup = `
      import { mkdir, writeFile } from 'node:fs/promises';
      import { join } from 'node:path';
      import { ensureStorageLayout } from ${JSON.stringify(new URL('../server/storage.mjs', import.meta.url).href)};
      import { createJob, readJob, updateJob, saveJobArtifact } from ${JSON.stringify(new URL('../server/jobs.mjs', import.meta.url).href)};
      await ensureStorageLayout();
      if (!await readJob('image-api-test')) {
        const job = await createJob({ id: 'image-api-test', promptId: 'test-prompt', payload: {} });
        await mkdir(job.outputDir, { recursive: true });
        const source = join(job.outputDir, 'pixel.png');
        await writeFile(source, Buffer.from(${JSON.stringify(png)}, 'base64'));
        await saveJobArtifact(job.id, source, 'image/png');
        await updateJob(job.id, { state: 'completed' });
      }
      await import(${JSON.stringify(new URL('../server/mock.mjs', import.meta.url).href)});
    `
    const child = spawn(process.execPath, ['--input-type=module', '-e', setup], {
      cwd: root,
      env: { ...process.env, STYLE_SHELF_DATA_DIR: join(root, 'data'), STYLE_SHELF_LIBRARY_DIR: join(root, 'library'),
        STYLE_SHELF_WEB_ROOT: webRoot,
        CODEX_HOME: join(root, 'codex'), CODEX_SKILLS_ROOT: join(root, 'codex', 'skills'),
        STYLE_SHELF_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    children.add(child)
    await new Promise((resolve, reject) => {
      let output = ''
      const timeout = setTimeout(() => reject(new Error(`API startup timeout: ${output}`)), 8000)
      const finish = (error) => { clearTimeout(timeout); error ? reject(error) : resolve() }
      child.on('error', finish)
      child.on('exit', (code) => finish(new Error(`API exited ${code}: ${output}`)))
      child.stderr.on('data', (chunk) => { output += chunk })
      child.stdout.on('data', (chunk) => {
        output += chunk
        if (output.includes(`listening on http://127.0.0.1:${port}`)) finish()
      })
    })
    return { child, port, base: `http://127.0.0.1:${port}` }
  }
  const path = '/api/jobs/image-api-test/output/result-01.png'
  const first = await start()
  const published = await fetch(`${first.base}/api/results`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(3000),
    body: JSON.stringify({ id: 'image-api-result', title: 'Pixel', styleName: 'Test', image: path, coverRatio: '4:3' }),
  })
  assert.equal(published.status, 201, await published.text())
  async function verify(base) {
    for (const catalog of ['skills', 'prompts']) {
      const response = await fetch(`${base}/api/${catalog}`, { signal: AbortSignal.timeout(3000) })
      assert.equal(response.status, 200)
      assert.deepEqual((await response.json())[catalog], [])
    }
    const response = await fetch(`${base}/api/results`, { signal: AbortSignal.timeout(3000) })
    assert.equal(response.status, 200)
    const { results } = await response.json()
    assert.equal(results[0].image, `${base}${path}`)
    const image = await fetch(results[0].image, { signal: AbortSignal.timeout(3000) })
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type'), 'image/png')
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(png, 'base64'))
    for (const assetPath of ['/skill-assets/custom/cover.png', '/skill-assets/bundled.png']) {
      const cover = await fetch(`${base}${assetPath}`, { signal: AbortSignal.timeout(3000) })
      assert.equal(cover.status, 200, assetPath)
      assert.equal(cover.headers.get('content-type'), 'image/png')
      assert.deepEqual(Buffer.from(await cover.arrayBuffer()), Buffer.from(png, 'base64'))
    }
    if (checkSymlink) {
      const escaped = await fetch(`${base}/skill-assets/custom/escape.png`, { signal: AbortSignal.timeout(3000) })
      assert.equal(escaped.status, 404)
      assert.ok(!(await escaped.text()).includes('private file must not be served'))
    }
  }
  await verify(first.base)
  assert.equal(JSON.parse(await readFile(join(root, 'data', 'results.json'), 'utf8'))[0].image, path)
  await stop(first.child)
  const second = await start(first.port)
  assert.notEqual(second.port, first.port)
  await verify(second.base)
})
