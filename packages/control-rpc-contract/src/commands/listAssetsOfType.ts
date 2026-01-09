import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { assetNodeSchema, assetTypeSchema } from './listAssetsTree.js'

export const listAssetsOfTypeCommand = {
	group: 'assets',
	kind: 'read',
	description: 'Lists all assets of a specific type in the project as a flat array.',
	input: z
		.object({
			type: assetTypeSchema.describe('The asset type to list'),
		})
		.strict()
		.describe('Input parameters for listing assets of a specific type'),
	output: z.array(assetNodeSchema).describe('Flat list of asset nodes matching the type'),
} satisfies CommandDefinition
