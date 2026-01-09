import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const focusOnObjectCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Focuses the main camera on a scene object by id.',
	input: z
		.object({
			id: z.string().min(1).describe('Scene object id to focus'),
			zoom: z.number().positive().optional().describe('Optional zoom override'),
			paddingPct: z
				.number()
				.min(0)
				.max(0.9)
				.optional()
				.describe('Optional padding percentage (0..0.9) applied to fit-to-bounds zoom'),
		})
		.strict()
		.describe('Input parameters for focusing the camera on a scene object'),
	output: successSchema.describe('Success response indicating the camera was updated'),
} satisfies CommandDefinition
