const { contextBridge, ipcRenderer } = require('electron')

const apiBase = process.argv.find((argument) => argument.startsWith('--style-shelf-api-base='))?.slice('--style-shelf-api-base='.length) || ''

contextBridge.exposeInMainWorld('styleShelfDesktop', {
  openLibrary: () => ipcRenderer.invoke('style-shelf:open-path', 'library'),
  openUploads: () => ipcRenderer.invoke('style-shelf:open-path', 'uploads'),
  openGenerated: () => ipcRenderer.invoke('style-shelf:open-path', 'generated'),
  apiBase,
})
