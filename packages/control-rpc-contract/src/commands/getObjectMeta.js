import { z } from 'zod'

import { objectSelectorV0Schema } from '../shared-schemas'
export const getObjectMetaCommand = {
	group: 'objects',
	description: 'Resolves an object selector to runtime object metadata.',
	input: z
		.object({
			target: objectSelectorV0Schema,
		})
		.strict()
		.describe('Input parameters for resolving an object selector'),
	output: z
		.object({
			id: z.string().min(1).describe('Runtime identifier of the object'),
			name: z.string().describe('Name of the object'),
			type: z.string().describe('Type of the object'),
			path: z.string().optional().describe('Resolved hierarchy path (only present when selecting by path)'),
		})
		.strict()
		.describe('Resolved object metadata'),
}
//# sourceMappingURL=getObjectMeta.js.map
