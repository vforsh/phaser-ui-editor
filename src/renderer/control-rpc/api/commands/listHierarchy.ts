import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export type HierarchyNode = {
	id: string
	name: string
	type: string
	children?: HierarchyNode[]
}

export const hierarchyNodeSchema: z.ZodType<HierarchyNode> = z.lazy(() =>
	z
		.object({
			id: z.string().describe('Unique identifier for the hierarchy node'),
			name: z.string().describe('Display name of the node'),
			type: z.string().describe('Type of the game object'),
			children: z.array(hierarchyNodeSchema).optional().describe('Children nodes in the hierarchy'),
		})
		.strict(),
)

export const listHierarchyCommand = {
	group: 'hierarchy',
	description: 'Retrieves the complete scene hierarchy of the currently edited context.',
	input: z.object({}).strict().describe('Input parameters for listing hierarchy (empty)'),
	output: hierarchyNodeSchema.describe('Root node of the scene hierarchy'),
} satisfies CommandDefinition
