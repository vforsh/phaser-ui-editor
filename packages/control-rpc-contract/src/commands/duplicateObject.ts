import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const duplicateObjectCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Duplicates the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
		})
		.strict()
		.describe('Input parameters for duplicating an object'),
	output: okResultSchema.describe('Result indicating whether the object was duplicated'),
} satisfies CommandDefinition
