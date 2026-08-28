import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pruneElectronLocales from '../scripts/prune-electron-locales.mjs'

test('mac packaging keeps only English and Simplified Chinese Electron locales', async (t) => {
  const appOutDir = await mkdtemp(join(tmpdir(), 'styleshelf-locales-'))
  const resourcesDir = join(
    appOutDir,
    'Style Shelf.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources',
  )
  t.after(() => rm(appOutDir, { recursive: true, force: true }))

  await Promise.all(['en.lproj', 'zh_CN.lproj', 'fr.lproj'].map((name) => mkdir(join(resourcesDir, name), { recursive: true })))
  await writeFile(join(resourcesDir, 'icudtl.dat'), 'keep')

  const context = { appOutDir, packager: { appInfo: { productFilename: 'Style Shelf' } } }
  await pruneElectronLocales({ ...context, electronPlatformName: 'win32' })
  assert.ok((await readdir(resourcesDir)).includes('fr.lproj'))

  await pruneElectronLocales({ ...context, electronPlatformName: 'darwin' })
  assert.deepEqual((await readdir(resourcesDir)).sort(), ['en.lproj', 'icudtl.dat', 'zh_CN.lproj'])
})
