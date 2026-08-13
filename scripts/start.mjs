import { spawn } from 'node:child_process'
import { loadLocalEnv } from './load-env.mjs'

await loadLocalEnv()

const frontendPort = process.env.STYLE_SHELF_FRONTEND_PORT || '4173'
const apiPort = process.env.STYLE_SHELF_PORT || '4317'
const children = [
  spawn(process.execPath, ['server/mock.mjs'], { stdio: 'inherit', env: process.env, detached: process.platform !== 'win32' }),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', frontendPort], {
    stdio: 'inherit',
    env: { ...process.env, VITE_API_BASE: process.env.VITE_API_BASE || `http://127.0.0.1:${apiPort}` },
    detached: process.platform !== 'win32',
  }),
]

console.log(`Style Shelf starting: API http://127.0.0.1:${apiPort} · Web http://127.0.0.1:${frontendPort}`)

let stopping = false
function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.killed || !child.pid) continue
    if (process.platform === 'win32') {
      const tree = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
      tree.on('error', () => child.kill())
    } else {
      try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill() }
    }
  }
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of children) child.on('exit', (code, signal) => {
  if (!stopping) {
    process.exitCode = code || 1
    stop()
  }
})
for (const child of children) child.on('error', (error) => {
  if (stopping) return
  console.error(`Style Shelf child process failed: ${error.message}`)
  process.exitCode = 1
  stop()
})
