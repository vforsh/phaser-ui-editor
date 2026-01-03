import process from 'node:process'
import { table } from 'table'

type TableData = Parameters<typeof table>[0]

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

/**
 * Pretty-prints a JS value as JSON to stdout (2-space indentation), followed by a newline.
 *
 * @param value - Any JSON-serializable value (or best-effort for values supported by `JSON.stringify`).
 */
export function printJson(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

/**
 * Prints a 2D array as a formatted table to stdout.
 *
 * Does nothing when `rows` is empty.
 *
 * @param rows - Table rows; each row is an array of cell values.
 */
export function printTable(rows: TableData): void {
	if (rows.length === 0) {
		return
	}
	process.stdout.write(table(rows))
}

/**
 * Prints a string (or array of strings) to stdout, followed by a newline.
 *
 * When an array is provided, lines are joined with `\n`.
 *
 * @param lines - Text content to output.
 */
export function printText(lines: string | string[]): void {
	const output = Array.isArray(lines) ? lines.join('\n') : lines
	process.stdout.write(`${output}\n`)
}

/**
 * Prints key-value pairs to stdout, one per line, in the format: `key: value`.
 *
 * @param data - Key-value pairs to output.
 */
export function printKV(data: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(data)) {
		const formattedValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : value
		process.stdout.write(`${key}: ${formattedValue}\n`)
	}
}
