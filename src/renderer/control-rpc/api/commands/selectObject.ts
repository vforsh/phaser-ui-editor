import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const selectObjectCommand = {
	group: 'objects',
	description: 'Selects a game object in the current scene, identified by its ID or path.',
	input: z
		.union([
			z
				.object({
					id: z.string().min(1).describe('Unique identifier of the game object'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Path to the game object in the hierarchy'),
				})
				.strict(),
		])
		.describe('Input parameters for selecting a game object (ID or path)'),
	output: successSchema.describe('Success response indicating the object was selected'),
} satisfies CommandDefinition
