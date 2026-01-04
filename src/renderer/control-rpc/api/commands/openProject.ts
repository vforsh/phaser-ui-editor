import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const openProjectCommand = {
	group: 'misc',
	description: 'Opens a project from the specified file system path.',
	input: z
		.object({
			path: z.string().min(1, 'path is required').describe('Absolute file system path to the project directory'),
		})
		.strict()
		.describe('Input parameters for opening a project'),
	output: successSchema.describe('Success response indicating the project was opened'),
} satisfies CommandDefinition
