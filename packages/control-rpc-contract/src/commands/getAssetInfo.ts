import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { assetNodeSchema } from './listAssets.js'

export const getAssetInfoCommand = {
	group: 'assets',
	kind: 'read',
	description: 'Retrieves detailed information about a specific asset by its ID or path.',
	input: z
		.union([
			z
				.object({
					id: z.string().min(1).describe('Unique identifier of the asset'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Project-relative path to the asset file'),
				})
				.strict(),
		])
		.describe('Input parameters for getting asset info (ID or path)'),
	output: assetNodeSchema.describe('Detailed asset information'),
} satisfies CommandDefinition
