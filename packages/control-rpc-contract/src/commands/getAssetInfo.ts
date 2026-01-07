import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { assetNodeSchema } from './listAssets'

export const getAssetInfoCommand = {
	group: 'assets',
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
