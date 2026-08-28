import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const keptLocales = new Set(['en.lproj', 'zh_CN.lproj'])

export default async function pruneElectronLocales({ appOutDir, electronPlatformName, packager }) {
  if (electronPlatformName !== 'darwin') return
  const resourcesDir = join(
    appOutDir,
    `${packager.appInfo.productFilename}.app`,
    'Contents/Frameworks/Electron Framework.framework/Versions/A/Resources',
  )
  const locales = (await readdir(resourcesDir)).filter((name) => name.endsWith('.lproj'))
  await Promise.all(locales.filter((name) => !keptLocales.has(name)).map((name) => rm(join(resourcesDir, name), { recursive: true })))
}
