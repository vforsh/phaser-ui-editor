import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { absolutePathSchema } from '../state-schemas'

export const takeAppScreenshotCommand = {
	group: 'debug',
	description:
		'Takes a screenshot of the full app window (web contents), saves it into <projectDir>/screenshots, and returns the absolute file path.',
	input: z
		.object({
			clean: z.boolean().optional().describe('Accepted for parity with takeCanvasScreenshot; currently a no-op. Defaults to false.'),
			format: z.enum(['png', 'jpg', 'webp']).optional().describe('File format/extension. Defaults to png.'),
		})
		.strict()
		.describe('Input parameters for taking an app window screenshot'),
	output: z
		.object({
			path: absolutePathSchema.describe('Absolute file system path to the saved screenshot file'),
		})
		.strict()
		.describe('Response containing the saved screenshot file path'),
} satisfies CommandDefinition
