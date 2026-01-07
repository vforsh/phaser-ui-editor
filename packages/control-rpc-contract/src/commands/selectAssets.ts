import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export const selectAssetsCommand = {
	group: 'assets',
	description: 'Selects one or more assets in the assets panel, identified by their IDs or paths.',
	input: z
		.object({
			assets: z
				.array(
					z.union([
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
					]),
				)
				.min(1)
				.describe('List of assets to select (identified by ID or path)'),
		})
		.strict()
		.describe('Input parameters for selecting assets'),
	output: z
		.object({
			assetIds: z.array(z.string()).describe('List of unique identifiers for the selected assets'),
		})
		.strict()
		.describe('Response containing the selected asset IDs'),
} satisfies CommandDefinition
