import { z } from 'zod'

import { absolutePathSchema } from '../../../state/Schemas'
import { CommandDefinition } from '../ControlApi'

export const takeAppPartScreenshotCommand = {
	group: 'debug',
	description:
		'Takes a screenshot of a DOM element selected by CSS selector, saves it into <projectDir>/screenshots, and returns the absolute file path.',
	input: z
		.object({
			selector: z.string().min(1).describe('CSS selector used with document.querySelector'),
			clean: z.boolean().optional().describe('Accepted for parity with takeCanvasScreenshot; currently a no-op. Defaults to false.'),
			format: z.enum(['png', 'jpg', 'webp']).optional().describe('File format/extension. Defaults to png.'),
			quality: z
				.number()
				.int()
				.min(0)
				.max(100)
				.optional()
				.describe('Quality for jpg/webp output (0..100). Ignored for png. Defaults to 95.'),
		})
		.strict()
		.describe('Input parameters for taking a screenshot of a DOM element'),
	output: z
		.object({
			path: absolutePathSchema.describe('Absolute file system path to the saved screenshot file'),
		})
		.strict()
		.describe('Response containing the saved screenshot file path'),
} satisfies CommandDefinition
