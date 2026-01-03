import process from 'node:process'
import { createValidationError } from './errors'

export async function readJsonInput(): Promise<unknown | undefined> {
	if (process.stdin.isTTY) {
		return undefined
	}

	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.from(chunk))
	}

	if (chunks.length === 0) {
		return undefined
	}

	const text = Buffer.concat(chunks).toString('utf8')
	if (text.trim().length === 0) {
		return undefined
	}

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
