import path from 'node:path'

export function isAbsolutePath(value: string): boolean {
	return path.isAbsolute(value) || path.win32.isAbsolute(value)
}

export function normalizePath(value: string): string {
	if (process.platform !== 'win32' && value.includes('\\')) {
		value = value.replace(/\\/g, '/')
	}

	if (path.win32.isAbsolute(value)) {
		if (process.platform !== 'win32') {
			return path.posix.normalize(value)
		}

		return path.win32.normalize(value)
	}

	return path.normalize(value)
}

export function normalizeAbsolutePath(value: string): string {
	const normalized = normalizePath(value)
	if (!isAbsolutePath(normalized)) {
		throw new Error('path should be absolute')
	}

	return normalized
}
