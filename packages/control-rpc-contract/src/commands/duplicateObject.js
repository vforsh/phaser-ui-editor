import { z } from 'zod'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas'
export const duplicateObjectCommand = {
	group: 'objects',
	description: 'Duplicates the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
		})
		.strict()
		.describe('Input parameters for duplicating an object'),
	output: okResultSchema.describe('Result indicating whether the object was duplicated'),
}
//# sourceMappingURL=duplicateObject.js.map
