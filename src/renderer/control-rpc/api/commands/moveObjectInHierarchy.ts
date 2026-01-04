import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const moveObjectInHierarchyCommand = {
	group: 'hierarchy',
	description: 'Moves an object to a new parent and index within the hierarchy.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
			newParent: nodeSelectorV0Schema.describe('New parent selector'),
			newIndex: z.number().int().nonnegative().describe('Index within the new parent'),
		})
		.strict()
		.describe('Input parameters for moving an object in the hierarchy'),
	output: okResultSchema.describe('Result indicating whether the object was moved'),
} satisfies CommandDefinition
