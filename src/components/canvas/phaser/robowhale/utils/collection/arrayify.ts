export function arrayify<T>(value: T | T[]): T[] {
	if (value === null || value === undefined) {
		return []
	}

	if (Array.isArray(value)) {
		return value
	}

	return [value]
}
