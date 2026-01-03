import { contextBridge, ipcRenderer, shell, webFrame } from 'electron'

export const electronAPI = {
  ipcRenderer,
  shell,
  webFrame
}

export { contextBridge, ipcRenderer, shell, webFrame }

export function exposeInMainWorld(key, api) {
  contextBridge.exposeInMainWorld(key, api)
}
