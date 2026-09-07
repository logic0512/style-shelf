import test from 'node:test'
import assert from 'node:assert/strict'

test('production browser URLs follow the page port; desktop bridge takes priority', async (t) => {
  const location = globalThis.location
  const desktop = globalThis.styleShelfDesktop
  t.after(() => {
    if (location === undefined) delete globalThis.location
    else globalThis.location = location
    if (desktop === undefined) delete globalThis.styleShelfDesktop
    else globalThis.styleShelfDesktop = desktop
  })
  globalThis.location = { origin: 'http://127.0.0.1:62003' }
  const web = await import('../src-v2/api.js?web')
  assert.equal(web.jobArtifactUrl('job-a', 'result 01.png'), 'http://127.0.0.1:62003/api/jobs/job-a/output/result%2001.png')
  globalThis.styleShelfDesktop = { apiBase: 'http://127.0.0.1:62004' }
  const app = await import('../src-v2/api.js?desktop')
  assert.equal(app.jobInputUrl('job-a', 'input.png'), 'http://127.0.0.1:62004/api/jobs/job-a/input/input.png')
  const fetch = globalThis.fetch
  t.after(() => { globalThis.fetch = fetch })
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: false, status: 500 } }
  await assert.rejects(web.loadSkillCatalog(), /local_api_500/)
  assert.equal(calls, 1, 'Failed API must not silently load a default catalog')

  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_skill_manifest' }) })
  await assert.rejects(web.loadSkillCatalog(), /invalid_skill_manifest/)
})
