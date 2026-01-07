import { z } from 'zod'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas'
export const renameObjectCommand = {
	group: 'objects',
	description: 'Renames the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
			name: z.string().min(1).describe('New name for the object'),
		})
		.strict()
		.describe('Input parameters for renaming an object'),
	output: okResultSchema.describe('Result indicating whether the object was renamed'),
}
//# sourceMappingURL=renameObject.js.map
