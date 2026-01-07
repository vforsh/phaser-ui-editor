import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { absolutePathSchema } from '../state-schemas.js'

export const takeCanvasScreenshotCommand = {
	group: 'debug',
	kind: 'read',
	description:
		'Takes a PNG screenshot of the current Phaser canvas, saves it into <projectDir>/screenshots, and returns the absolute file path.',
	input: z
		.object({
			clean: z.boolean().optional().describe('Hide editor overlays before capturing (best-effort). Defaults to false.'),
			format: z.enum(['png', 'jpg', 'webp']).optional().describe('File format/extension. Defaults to png.'),
		})
		.strict()
		.describe('Input parameters for taking a canvas screenshot'),
	output: z
		.object({
			path: absolutePathSchema.describe('Absolute file system path to the saved screenshot file'),
		})
		.strict()
		.describe('Response containing the saved screenshot file path'),
} satisfies CommandDefinition
