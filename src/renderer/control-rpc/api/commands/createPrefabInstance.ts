import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const createPrefabInstanceCommand = {
	group: 'objects',
	description: 'Creates a prefab instance (stub via asset drop).',
	input: z
		.object({
			parent: nodeSelectorV0Schema.describe('Parent node selector'),
			prefabAssetId: z.string().min(1).describe('Prefab asset id'),
			position: z
				.object({
					x: z.number().finite().describe('Canvas X coordinate'),
					y: z.number().finite().describe('Canvas Y coordinate'),
				})
				.strict()
				.optional()
				.describe('Optional drop position'),
			insertIndex: z.number().int().nonnegative().optional().describe('Insertion index (stub, not used)'),
		})
		.strict()
		.describe('Input parameters for creating a prefab instance'),
	output: okResultSchema.describe('Result indicating whether the prefab instance was created'),
} satisfies CommandDefinition
