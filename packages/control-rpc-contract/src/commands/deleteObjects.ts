import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const deleteObjectsCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Deletes multiple game objects from the current scene by their IDs.',
	input: z
		.object({
			ids: z.array(z.string()).describe('List of game object IDs to delete'),
		})
		.strict()
		.describe('Input parameters for deleting objects'),
	output: successSchema.describe('Success response indicating the objects were deleted'),
} satisfies CommandDefinition
