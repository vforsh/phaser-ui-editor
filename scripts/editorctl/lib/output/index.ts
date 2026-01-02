import { printJson } from './json'
import { printTable } from './table'
import { printKV, printText } from './text'

export interface OutputFacade {
	printJson: typeof printJson
	printTable: typeof printTable
	printText: typeof printText
	printKV: typeof printKV
}

export const createOutputFacade = (options: { mode: 'json' | 'human' }): OutputFacade => {
	if (options.mode === 'json') {
		return {
			printJson,
			printTable: (rows) => printJson(rows),
			printText: (lines) => printJson(lines),
			printKV: (data) => printJson(data),
		}
	}

	return {
		printJson,
		printTable,
		printText,
		printKV,
	}
}
