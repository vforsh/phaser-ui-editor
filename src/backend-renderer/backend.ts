import { backendContract } from '../backend-contract/contract'
import type { BackendApi, BackendMethod } from '../backend-contract/types'

function requireBackend(): BackendApi {
	if (!window.backend) {
		throw new Error('Backend API is not available. Did the preload script load?')
	}

	return window.backend
}

const rawBackend = requireBackend()

export const backend = (Object.keys(backendContract) as BackendMethod[]).reduce((api, method) => {
	api[method] = (async (input) => {
		const parsedInput = backendContract[method].input.parse(input)
		const result = await rawBackend[method](parsedInput as never)
		return backendContract[method].output.parse(result)
	}) as BackendApi[BackendMethod]

	return api
}, {} as BackendApi)
