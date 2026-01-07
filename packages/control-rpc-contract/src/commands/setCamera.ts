import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const setCameraCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Updates the main canvas camera zoom and/or scroll position.',
	input: z
		.object({
			zoom: z.number().positive().optional().describe('Camera zoom level'),
			scrollX: z.number().optional().describe('Camera scroll X position'),
			scrollY: z.number().optional().describe('Camera scroll Y position'),
		})
		.strict()
		.describe('Input parameters for setting camera zoom or scroll positions'),
	output: successSchema.describe('Success response indicating the camera was updated'),
} satisfies CommandDefinition
