import { z } from 'zod'

import { okResultSchema } from '../shared-schemas'
export const savePrefabCommand = {
	group: 'misc',
	description: 'Saves the currently opened prefab.',
	input: z.object({}).strict().describe('No input parameters'),
	output: okResultSchema.describe('Result indicating whether the prefab was saved'),
}
//# sourceMappingURL=savePrefab.js.map
