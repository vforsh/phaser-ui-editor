import path from 'node:path'

export function isAbsolutePath(value: string): boolean {
	return path.isAbsolute(value) || path.win32.isAbsolute(value)
}

export function normalizePath(value: string): string {
	if (path.win32.isAbsolute(value)) {
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
