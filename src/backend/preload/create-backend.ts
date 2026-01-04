import { ipcRenderer } from 'electron'

import type { BackendApi, BackendMethod } from '../contract/contract'

import { backendContract } from '../contract/contract'

const CHANNEL_PREFIX = 'backend:'

/**
 * Creates a proxy API for the backend methods defined in the contract.
 * Each method call is forwarded to the main process via IPC.
 */
export function createBackend(): BackendApi {
	const api = {} as BackendApi

	for (const method of Object.keys(backendContract) as BackendMethod[]) {
		assignBackendMethod(api, method, createBackendMethod(method))
	}

	return api
}

function assignBackendMethod<M extends BackendMethod>(api: BackendApi, method: M, impl: BackendApi[M]): void {
	api[method] = impl
}

function createBackendMethod<M extends BackendMethod>(method: M): BackendApi[M] {
	return ((input: Parameters<BackendApi[M]>[0]) => {
		return ipcRenderer.invoke(`${CHANNEL_PREFIX}${method}`, input) as ReturnType<BackendApi[M]>
	}) as BackendApi[M]
}
