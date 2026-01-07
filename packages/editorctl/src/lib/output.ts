import process from 'node:process'

/**
 * Pretty-prints a JS value as JSON to stdout (2-space indentation), followed by a newline.
 *
 * @param value - Any JSON-serializable value (or best-effort for values supported by `JSON.stringify`).
 */
export function printJson(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}
