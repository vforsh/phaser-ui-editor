import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const selectObjectCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Selects an object in the current prefab, identified by runtime id or hierarchy path.',
	input: z
		.object({
			target: objectSelectorV0Schema,
		})
		.strict()
		.describe('Input parameters for selecting an object'),
	output: okResultSchema.describe('Result indicating whether the object was selected'),
} satisfies CommandDefinition
