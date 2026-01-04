import { ipcRenderer } from 'electron'

import type { MainApi, MainApiMethod } from '../shared/main-api/MainApi'

import { mainApiContract } from '../shared/main-api/MainApi'

const CHANNEL_PREFIX = 'main-api:'

/**
 * Creates a proxy API for the main process methods defined in the contract.
 * Each method call is forwarded to the main process via IPC.
 */
export function createMainApi(): MainApi {
	const api = {} as MainApi

	for (const method of Object.keys(mainApiContract) as MainApiMethod[]) {
		assignMainApiMethod(api, method, createMainApiMethod(method))
	}

	return api
}

function assignMainApiMethod<M extends MainApiMethod>(api: MainApi, method: M, impl: MainApi[M]): void {
	api[method] = impl
}

function createMainApiMethod<M extends MainApiMethod>(method: M): MainApi[M] {
	return ((input: Parameters<MainApi[M]>[0]) => {
		return ipcRenderer.invoke(`${CHANNEL_PREFIX}${method}`, input) as ReturnType<MainApi[M]>
	}) as MainApi[M]
}
