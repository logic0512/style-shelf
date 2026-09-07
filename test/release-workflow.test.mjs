import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('release workflow publishes only matching version tags', async () => {
  const workflow = await readFile(new URL('../.github/workflows/desktop-release.yml', import.meta.url), 'utf8')
  assert.match(workflow, /Verify release tag matches package version/)
  assert.match(workflow, /GITHUB_REF_NAME.*package\.json/)
  assert.match(workflow, /if: github\.ref_type == 'tag'/)
})
