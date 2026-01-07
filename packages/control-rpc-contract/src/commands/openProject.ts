import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const openProjectCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Opens a project from the specified file system path.',
	input: z
		.object({
			path: z.string().min(1, 'path is required').describe('Absolute file system path to the project directory'),
		})
		.strict()
		.describe('Input parameters for opening a project'),
	output: successSchema.describe('Success response indicating the project was opened'),
} satisfies CommandDefinition
