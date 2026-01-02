import process from 'node:process'

export function printText(lines: string | string[]): void {
	const output = Array.isArray(lines) ? lines.join('\n') : lines
	process.stdout.write(`${output}\n`)
}

export function printKV(data: Record<string, any>): void {
	for (const [key, value] of Object.entries(data)) {
		process.stdout.write(`${key}: ${value}\n`)
	}
}
