import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { loadLocalEnv } from '../scripts/load-env.mjs'

const isDev = process.argv.includes('--dev')
let apiPort = null
let serverProcess = null
let apiSpawnError = null
let stopping = false
let mainWindow = null
let appRoot = null

async function resolveAppRoot() {
  const candidate = app.getAppPath()
  const unpacked = join(process.resourcesPath, 'app.asar.unpacked')
  try {
    await access(join(unpacked, 'server', 'mock.mjs'))
    return unpacked
  } catch {}
  try {
    await access(join(candidate, 'server', 'mock.mjs'))
    return candidate
  } catch {
    return resolve(candidate, '..')
  }
}

async function findFreePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolvePort(typeof address === 'object' && address ? address.port : 4317))
    })
  })
}

function runtimePaths() {
  const libraryDir = resolve(process.env.STYLE_SHELF_LIBRARY_DIR || join(app.getPath('pictures'), 'Style Shelf'))
  const dataDir = resolve(process.env.STYLE_SHELF_DATA_DIR || join(app.getPath('userData'), 'data'))
  return {
    dataDir,
    libraryDir,
    uploadsDir: join(libraryDir, 'Uploads'),
    generatedDir: join(libraryDir, 'Generated'),
  }
}

async function startApi() {
  // 开发时读取仓库 .env；打包后 cwd 不可靠，再读取用户专属配置目录。
  // loadLocalEnv 保留已有环境变量，因此终端显式配置优先于文件配置。
  await loadLocalEnv(process.cwd())
  await loadLocalEnv(app.getPath('userData'))
  const paths = runtimePaths()
  appRoot = await resolveAppRoot()
  apiPort = await findFreePort()
  apiSpawnError = null
  const root = appRoot
  const env = {
    ...process.env,
    STYLE_SHELF_DATA_DIR: paths.dataDir,
    STYLE_SHELF_LIBRARY_DIR: paths.libraryDir,
    STYLE_SHELF_WEB_ROOT: join(root, 'dist'),
    STYLE_SHELF_PORT: String(apiPort),
    STYLE_SHELF_FRONTEND_PORT: String(apiPort),
    ELECTRON_RUN_AS_NODE: '1',
  }
  serverProcess = spawn(process.execPath, [join(root, 'server/mock.mjs')], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    windowsHide: true,
  })
  serverProcess.stdout.on('data', (chunk) => console.log(`[Style Shelf] ${chunk.toString().trimEnd()}`))
  serverProcess.stderr.on('data', (chunk) => console.error(`[Style Shelf] ${chunk.toString().trimEnd()}`))
  serverProcess.once('error', (error) => { apiSpawnError = error })
  serverProcess.once('exit', (code, signal) => {
    if (!stopping && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('Style Shelf 本地服务已停止', `服务退出：${signal || code || '未知原因'}`)
      app.quit()
    }
  })
  return paths
}

async function waitForApi() {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (apiSpawnError) throw apiSpawnError
    if (!serverProcess || serverProcess.exitCode != null) throw new Error('local_api_stopped')
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('local_api_timeout')
}

function registerDesktopIpc(paths) {
  ipcMain.handle('style-shelf:open-path', async (_event, kind) => {
    const target = kind === 'uploads' ? paths.uploadsDir : kind === 'generated' ? paths.generatedDir : kind === 'library' ? paths.libraryDir : null
    if (!target) throw new Error('invalid_storage_path')
    return shell.openPath(target)
  })
}

function stopApi() {
  if (!serverProcess || !serverProcess.pid || serverProcess.exitCode != null || serverProcess.signalCode) return Promise.resolve()
  const child = serverProcess
  serverProcess = null
  return new Promise((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      resolve()
    }
    child.once('exit', finish)
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
      killer.once('exit', () => {})
      killer.once('error', () => child.kill())
    } else {
      try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
      setTimeout(() => {
        if (finished) return
        try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
      }, 3000)
    }
    setTimeout(finish, 3000)
  })
}

async function createMainWindow() {
  const paths = await startApi()
  registerDesktopIpc(paths)
  await waitForApi()
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(appRoot, 'electron/preload.cjs'),
      additionalArguments: [`--style-shelf-api-base=http://127.0.0.1:${apiPort}`],
    },
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  await mainWindow.loadURL(`http://127.0.0.1:${apiPort}/`)
  if (isDev) mainWindow.webContents.openDevTools()
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.on('before-quit', (event) => {
    if (stopping) return
    event.preventDefault()
    stopping = true
    stopApi().finally(() => app.exit())
  })
  app.whenReady().then(() => createMainWindow()).catch((error) => {
    dialog.showErrorBox('Style Shelf 启动失败', error.message || String(error))
    app.quit()
  })
  app.on('window-all-closed', () => app.quit())
}
