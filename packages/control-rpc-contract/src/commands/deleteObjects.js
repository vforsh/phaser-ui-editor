import { z } from 'zod'

import { successSchema } from '../shared-schemas'
export const deleteObjectsCommand = {
	group: 'objects',
	description: 'Deletes multiple game objects from the current scene by their IDs.',
	input: z
		.object({
			ids: z.array(z.string()).describe('List of game object IDs to delete'),
		})
		.strict()
		.describe('Input parameters for deleting objects'),
	output: successSchema.describe('Success response indicating the objects were deleted'),
}
//# sourceMappingURL=deleteObjects.js.map
