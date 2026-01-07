import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const setCameraCommand = {
	group: 'misc',
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
