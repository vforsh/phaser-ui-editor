import type { BackendApi, BackendMethod } from '../../backend/contract/contract'

import { backendContract } from '../../backend/contract/contract'

function requireBackend(): BackendApi {
	if (!window.backend) {
		throw new Error('Backend API is not available. Did the preload script load?')
	}

	return window.backend
}

const rawBackend = requireBackend()

function createBackendMethod<M extends BackendMethod>(method: M): BackendApi[M] {
	return (async (input) => {
		const parsedInput = backendContract[method].input.parse(input)
		const result = await rawBackend[method](parsedInput as never)
		return backendContract[method].output.parse(result)
	}) as BackendApi[M]
}

const backendImpl = {} as Record<BackendMethod, BackendApi[BackendMethod]>

for (const method of Object.keys(backendContract) as BackendMethod[]) {
	backendImpl[method] = createBackendMethod(method)
}

/**
 * Renderer-side client for the app "backend" API (main-process services).
 *
 * What "backend" means here:
 * - The actual implementations live in the Electron **main** process (`backendHandlers`).
 * - The API is exposed to the renderer by the **preload** script as `window.backend`.
 * - Calls are forwarded over Electron IPC (`ipcRenderer.invoke('backend:<method>')`).
 *
 * This wrapper adds runtime validation (Zod) using {@link backendContract} for both
 * inputs and outputs, so renderer code can call `backend.<method>(...)` safely with
 * fully-typed results.
 */
export const backend = backendImpl as BackendApi
