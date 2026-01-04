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
