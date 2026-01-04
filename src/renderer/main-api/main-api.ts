import type { MainApi, MainApiMethod } from '../../backend/contract/contract'

import { mainApiContract } from '../../backend/contract/contract'

function requireMainApi(): MainApi {
	if (!window.mainApi) {
		throw new Error('Main API is not available. Did the preload script load?')
	}

	return window.mainApi
}

const rawMainApi = requireMainApi()

function createMainApiMethod<M extends MainApiMethod>(method: M): MainApi[M] {
	return (async (input) => {
		const parsedInput = mainApiContract[method].input.parse(input)
		const result = await rawMainApi[method](parsedInput as never)
		return mainApiContract[method].output.parse(result)
	}) as MainApi[M]
}

const mainApiImpl = {} as Record<MainApiMethod, MainApi[MainApiMethod]>

for (const method of Object.keys(mainApiContract) as MainApiMethod[]) {
	mainApiImpl[method] = createMainApiMethod(method)
}

/**
 * Renderer-side client for the app main-process API (main-process services).
 *
 * What "mainApi" means here:
 * - The actual implementations live in the Electron **main** process (`mainApiHandlers`).
 * - The API is exposed to the renderer by the **preload** script as `window.mainApi`.
 * - Calls are forwarded over Electron IPC (`ipcRenderer.invoke('main-api:<method>')`).
 *
 * This wrapper adds runtime validation (Zod) using {@link mainApiContract} for both
 * inputs and outputs, so renderer code can call `mainApi.<method>(...)` safely with
 * fully-typed results.
 */
export const mainApi = mainApiImpl as MainApi
