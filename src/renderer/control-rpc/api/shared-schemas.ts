import { z } from 'zod'

/**
 * Shared schemas that must not depend on `ControlApi.ts` to avoid ESM circular-import TDZ issues.
 */
export const successSchema = z
	.object({
		success: z.literal(true).describe('Indicates the operation was successful'),
	})
	.strict()
	.describe('Standard success response')

export const objectSelectorV0Schema = z
	.union([
		z
			.object({
				id: z.string().min(1).describe('Runtime identifier of the object'),
			})
			.strict(),
		z
			.object({
				path: z.string().min(1).describe('Hierarchy path to the object'),
			})
			.strict(),
	])
	.describe('Object selector using runtime id or hierarchy path')

export type ObjectSelectorV0 = z.infer<typeof objectSelectorV0Schema>

export const commandErrorSchema = z
	.object({
		kind: z.enum(['validation', 'io', 'internal', 'timeout', 'not_supported_yet']).describe('Error category'),
		message: z.string().min(1).describe('Human-readable error message'),
	})
	.strict()
	.describe('Standard error payload for control RPC commands')

export const commandBlockedSchema = z
	.object({
		reason: z.string().min(1).describe('Short blocked reason identifier'),
		message: z.string().optional().describe('Human-readable blocked message'),
	})
	.strict()
	.describe('Standard blocked payload for control RPC commands')

export const okResultSchema = z
	.union([
		z
			.object({
				ok: z.literal(true).describe('Indicates the operation succeeded'),
			})
			.strict(),
		z
			.object({
				ok: z.literal(false).describe('Indicates the operation failed'),
				error: commandErrorSchema,
			})
			.strict(),
		z
			.object({
				ok: z.literal(false).describe('Indicates the operation was blocked'),
				blocked: commandBlockedSchema,
			})
			.strict(),
	])
	.describe('Standard result payload for control RPC commands')
