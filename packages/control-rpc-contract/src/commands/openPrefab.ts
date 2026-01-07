import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const openPrefabCommand = {
	group: 'assets',
	kind: 'write',
	description: 'Opens a prefab for editing, identified by either its asset ID or project-relative path.',
	input: z
		.union([
			z
				.object({
					assetId: z.string().min(1).describe('Unique identifier of the prefab asset'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Project-relative path to the prefab file (as returned by listAssets)'),
				})
				.strict(),
		])
		.describe('Input parameters for opening a prefab (ID or path)'),
	output: successSchema.describe('Success response indicating the prefab was opened'),
} satisfies CommandDefinition
