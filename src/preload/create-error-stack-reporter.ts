import { ipcRenderer } from 'electron'

import type { ErrorStackReporter } from '../shared/ipc/errorStackReporterTypes'

import { CHANNELS } from '../shared/ipc/channels'

/**
 * Dev-only API exposed to the renderer (main world) for forwarding error stack traces to the main process.
 *
 * Why this exists:
 * - Electron's `webContents.on('console-message')` only provides a string and often drops stack traces.
 * - With `contextIsolation: true`, preload code runs in an isolated world, so the main-world
 *   `window.onerror` / `unhandledrejection` / `console.error` hooks must live in the renderer.
 * - The renderer then forwards stack traces to the main process via IPC so they can be written to
 *   the existing per-run renderer log file under `./logs`.
 *
 * @link src/main/main.ts - IPC listener that receives payloads and writes them via `RendererFileLogger`.
 * @link src/main/RendererFileLogger.ts - `RendererFileLogger.logRendererErrorWithStack(...)`.
 * @link src/renderer/utils/installRendererErrorStackForwarding.ts - `RendererErrorStackForwarder` (main-world hooks).
 */
export function createErrorStackReporter(channel = CHANNELS.ERROR_STACK_REPORTER): ErrorStackReporter {
	return {
		/**
		 * Sends a renderer-originated payload (kind/message/stack) to the main process logger.
		 * The payload is intentionally `unknown` here; the main process validates it before logging.
		 */
		sendErrorStack: (payload) => ipcRenderer.send(channel, payload),
	}
}
