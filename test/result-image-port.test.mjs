import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('gallery images survive an API port change and persist without a port', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'styleshelf-results-'))
  process.env.STYLE_SHELF_DATA_DIR = root
  process.env.STYLE_SHELF_PORT = '54311'
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = await import('../server/store.mjs')
  const path = '/api/jobs/job-a/output/result%2001.png'
  const images = [`http://127.0.0.1:51456${path}`, `http://localhost:51456${path}`, path,
    '/skill-assets/sample.png', 'https://example.com/sample.png', undefined]
  await writeFile(join(root, 'results.json'), JSON.stringify(images.map((image, id) => ({ id, image }))))
  const results = await store.readResults()
  assert.deepEqual(results.map((r) => r.image), images.map((image, i) => i < 3 ? `http://127.0.0.1:54311${path}` : image))
  await store.updateResults((current) => current)
  const saved = JSON.parse(await readFile(join(root, 'results.json'), 'utf8'))
  assert.deepEqual(saved.slice(0, 3).map((r) => r.image), [path, path, path])
  process.env.STYLE_SHELF_PORT = '54312'
  assert.equal((await store.readResults())[0].image, `http://127.0.0.1:54312${path}`)
})
