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
			format: z.enum(['png', 'jpg', 'webp']).optional().describe('File format/extension. Defaults to png.'),
			quality: z
				.number()
				.min(0)
				.max(100)
				.optional()
				.describe('Quality for jpg/webp output (0..1 or 0..100). Ignored for png. Defaults to 0.92.'),
			scale: z.number().optional().describe('Rendering scale factor. Defaults to devicePixelRatio.'),
			includeFixed: z
				.enum(['none', 'intersecting', 'all'])
				.optional()
				.describe('How to include fixed-position elements. Defaults to intersecting.'),
			backgroundColor: z.union([z.string(), z.null()]).optional().describe('Canvas background color (null for transparency).'),
			clipToViewport: z.boolean().optional().describe('Clip to viewport before capture. Defaults to true.'),
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
