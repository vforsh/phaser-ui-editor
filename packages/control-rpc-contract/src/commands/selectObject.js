import { z } from 'zod'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas'
export const selectObjectCommand = {
	group: 'objects',
	description: 'Selects an object in the current prefab, identified by runtime id or hierarchy path.',
	input: z
		.object({
			target: objectSelectorV0Schema,
		})
		.strict()
		.describe('Input parameters for selecting an object'),
	output: okResultSchema.describe('Result indicating whether the object was selected'),
}
//# sourceMappingURL=selectObject.js.map
