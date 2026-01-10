import process from 'node:process'

export function wasPortFlagProvided(argv: string[] = process.argv): boolean {
	if (!Array.isArray(argv) || argv.length === 0) {
		return false
	}

	for (const arg of argv) {
		if (typeof arg !== 'string') {
			return false
		}

		if (arg === '--port' || arg === '-p') {
			return true
		}

		if (arg.startsWith('--port=') || arg.startsWith('-p=')) {
			return true
		}

		if (arg.startsWith('-p') && arg.length > 2) {
			return true
		}
	}

	return false
}
