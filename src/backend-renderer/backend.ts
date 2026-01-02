import { backendContract } from '../backend-contract/contract'
import type { BackendApi, BackendMethod } from '../backend-contract/types'

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

export const backend = backendImpl as BackendApi
