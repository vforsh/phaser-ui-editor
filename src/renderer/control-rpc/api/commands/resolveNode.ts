import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema } from '../shared-schemas'

export const resolveNodeCommand = {
	group: 'objects',
	description: 'Resolves a node selector to runtime object metadata.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
		})
		.strict()
		.describe('Input parameters for resolving a node'),
	output: z
		.object({
			runtimeId: z.string().min(1).describe('Runtime identifier of the node'),
			name: z.string().describe('Name of the node'),
			type: z.string().describe('Type of the node'),
		})
		.strict()
		.describe('Resolved node metadata'),
} satisfies CommandDefinition
