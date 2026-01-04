export const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function formatScreenshotTimestamp(date: Date): string {
	// 2026-01-02T12-34-56 (filesystem-safe across platforms)
	return date
		.toISOString()
		.replace(/\.\d{3}Z$/, '')
		.replace(/:/g, '-')
}

export function sanitizeFileNamePart(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) {
		return 'screenshot'
	}

	// Replace characters that are commonly invalid/unfriendly in filenames.
	return trimmed
		.replace(/[<>:"/\\|?*]/g, '_')
		.replace(/\s+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
}

export function getPrefabBaseName(name: string): string {
	const trimmed = name.trim()
	if (!trimmed) {
		return ''
	}

	// Handle `.prefab.json` and `.prefab` explicitly (common in this repo).
	const withoutKnownExt = trimmed.replace(/\.prefab\.json$/i, '').replace(/\.prefab$/i, '')
	if (withoutKnownExt !== trimmed) {
		return withoutKnownExt
	}

	// Fallback: strip the last extension.
	return trimmed.replace(/\.[^.]+$/, '')
}
