import { ipcMain } from 'electron'

import type { MainApiInput, MainApiMethod, MainApiOutput } from '../../shared/main-api/MainApi'

import { mainApiContract } from '../../shared/main-api/MainApi'
import { mainApiHandlers } from './handlers'

const CHANNEL_PREFIX = 'main-api:'

export function registerMainApiHandlers() {
	;(Object.keys(mainApiContract) as MainApiMethod[]).forEach((method) => {
		ipcMain.handle(`${CHANNEL_PREFIX}${method}`, async (_event, input: MainApiInput<typeof method>) => {
			const parsedInput = mainApiContract[method].input.parse(input)
			const result = await mainApiHandlers[method](parsedInput as never)
			return mainApiContract[method].output.parse(result as MainApiOutput<typeof method>)
		})
	})
}

export function getMainApiChannel(method: MainApiMethod): string {
	return `${CHANNEL_PREFIX}${method}`
}
