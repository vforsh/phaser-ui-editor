import { ipcMain } from 'electron'

import type { BackendInput, BackendMethod, BackendOutput } from '../../shared/main-api/MainApi'

import { backendContract } from '../../shared/main-api/MainApi'
import { backendHandlers } from './handlers'

const CHANNEL_PREFIX = 'backend:'

export function registerBackendHandlers() {
	;(Object.keys(backendContract) as BackendMethod[]).forEach((method) => {
		ipcMain.handle(`${CHANNEL_PREFIX}${method}`, async (_event, input: BackendInput<typeof method>) => {
			const parsedInput = backendContract[method].input.parse(input)
			const result = await backendHandlers[method](parsedInput as never)
			return backendContract[method].output.parse(result as BackendOutput<typeof method>)
		})
	})
}

export function getBackendChannel(method: BackendMethod): string {
	return `${CHANNEL_PREFIX}${method}`
}
