import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'

import '../renderer/backend-preload/index'

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('electron', electronAPI)
	} catch (error) {
		console.error('[preload] Failed to expose `electron` API', error)
	}
} else {
	;(globalThis as unknown as { electron: typeof electronAPI }).electron = electronAPI
}
