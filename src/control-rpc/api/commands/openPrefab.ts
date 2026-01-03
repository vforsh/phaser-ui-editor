import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const openPrefabCommand = {
	group: 'assets',
	description: 'Opens a prefab for editing, identified by either its asset ID or file path.',
	input: z
		.union([
			z
				.object({
					assetId: z.string().min(1).describe('Unique identifier of the prefab asset'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Project-relative path to the prefab file'),
				})
				.strict(),
		])
		.describe('Input parameters for opening a prefab (ID or path)'),
	output: successSchema.describe('Success response indicating the prefab was opened'),
} satisfies CommandDefinition
