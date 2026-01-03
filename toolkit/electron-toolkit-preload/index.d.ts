import type { IpcRenderer, WebFrame } from 'electron'
import { contextBridge, ipcRenderer, shell, webFrame } from 'electron'

export interface ElectronApi {
  ipcRenderer: IpcRenderer
  shell: typeof shell
  webFrame: WebFrame
}

export const electronAPI: ElectronApi
export { contextBridge, ipcRenderer, shell, webFrame }
export function exposeInMainWorld<T extends object>(key: string, api: T): void
