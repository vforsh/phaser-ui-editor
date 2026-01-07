import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { okResultSchema } from '../shared-schemas'

export const savePrefabCommand = {
	group: 'misc',
	description: 'Saves the currently opened prefab.',
	input: z.object({}).strict().describe('No input parameters'),
	output: okResultSchema.describe('Result indicating whether the prefab was saved'),
} satisfies CommandDefinition
