import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export const getObjectCommand = {
	group: 'objects',
	description: 'Gets a game object JSON in the current prefab, identified by its ID or path.',
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
		.describe('Input parameters for getting a game object (ID or path)'),
	output: z.unknown().describe('Editable object JSON for the resolved game object'),
} satisfies CommandDefinition
