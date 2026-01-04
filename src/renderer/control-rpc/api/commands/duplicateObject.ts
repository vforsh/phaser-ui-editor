import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const duplicateObjectCommand = {
	group: 'objects',
	description: 'Duplicates the target object.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
		})
		.strict()
		.describe('Input parameters for duplicating an object'),
	output: okResultSchema.describe('Result indicating whether the object was duplicated'),
} satisfies CommandDefinition
