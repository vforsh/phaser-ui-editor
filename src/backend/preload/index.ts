import { contextBridge } from 'electron'

import { createAppMenu } from './create-app-menu'
import { createBackend } from './create-backend'
import { createControlIpc } from './create-control-ipc'

/**
 * Safely exposes a value to the renderer's global context.
 *
 * In a context-isolated environment, it uses `contextBridge.exposeInMainWorld`.
 * Otherwise, it directly attaches the value to `globalThis`.
 *
 * @param key - The property name on the global `window` object.
 * @param value - The data or API to expose.
 */
function exposeInRendererGlobal(key: string, value: unknown) {
	if (process.contextIsolated) {
		try {
			contextBridge.exposeInMainWorld(key, value)
		} catch (error) {
			console.error(`[preload] Failed to expose \`${key}\` API`, error)
		}

		return
	}

	;(globalThis as Record<string, unknown>)[key] = value
}

exposeInRendererGlobal('backend', createBackend())

exposeInRendererGlobal('appMenu', createAppMenu())

if (process.env.NODE_ENV !== 'production') {
	exposeInRendererGlobal('controlIpc', createControlIpc())
}
