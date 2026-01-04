import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const selectNodeCommand = {
	group: 'objects',
	description: 'Selects a node by runtime id or hierarchy path.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
		})
		.strict()
		.describe('Input parameters for selecting a node'),
	output: okResultSchema.describe('Result indicating whether the node was selected'),
} satisfies CommandDefinition
