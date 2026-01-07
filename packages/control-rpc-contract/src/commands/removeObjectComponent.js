import { z } from 'zod'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas'
export const removeObjectComponentCommand = {
	group: 'objects',
	description: 'Removes a component from the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
			component: z
				.union([
					z
						.object({
							id: z.string().min(1).describe('Component runtime identifier'),
						})
						.strict(),
					z
						.object({
							type: z.string().min(1).describe('Component type identifier'),
						})
						.strict(),
				])
				.describe('Component selector by id or type'),
		})
		.strict()
		.describe('Input parameters for removing a component from an object'),
	output: okResultSchema.describe('Result indicating whether the component was removed'),
}
//# sourceMappingURL=removeObjectComponent.js.map
