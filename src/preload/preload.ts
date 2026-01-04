import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'

import { createAppMenu } from './create-app-menu'
import { createBackend } from './create-backend'
import { createControlIpc } from './create-control-ipc'

exposeInRenderer('electron', electronAPI)

exposeInRenderer('backend', createBackend())

exposeInRenderer('appMenu', createAppMenu())

if (process.env.NODE_ENV !== 'production') exposeInRenderer('controlIpc', createControlIpc())

/**
 * Safely exposes a value to the renderer's global context.
 *
 * In a context-isolated environment, it uses `contextBridge.exposeInMainWorld`.
 * Otherwise, it directly attaches the value to `globalThis`.
 *
 * The "Main World" is the JavaScript context that renderer code runs in.
 *
 * @param key - The property name on the global `window` object.
 * @param value - The data or API to expose.
 */
function exposeInRenderer(key: string, value: unknown) {
	if (!process.contextIsolated) {
		;(globalThis as Record<string, unknown>)[key] = value
		return
	}

	try {
		contextBridge.exposeInMainWorld(key, value)
	} catch (error) {
		console.error(`[preload] Failed to expose \`${key}\` API to renderer`, error)
	}
}
