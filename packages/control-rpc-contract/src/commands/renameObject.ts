import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const renameObjectCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Renames the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
			name: z.string().min(1).describe('New name for the object'),
		})
		.strict()
		.describe('Input parameters for renaming an object'),
	output: okResultSchema.describe('Result indicating whether the object was renamed'),
} satisfies CommandDefinition
