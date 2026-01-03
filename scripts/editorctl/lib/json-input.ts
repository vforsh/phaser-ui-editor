import { createValidationError } from './errors'

export function parseJsonText(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch (error) {
		throw createValidationError('Invalid JSON input', {
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw createValidationError('Expected JSON object input', {
			received: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
		})
	}

	return value as Record<string, unknown>
}
