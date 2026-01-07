import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { okResultSchema } from '../shared-schemas.js'

export const savePrefabCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Saves the currently opened prefab.',
	input: z.object({}).strict().describe('No input parameters'),
	output: okResultSchema.describe('Result indicating whether the prefab was saved'),
} satisfies CommandDefinition
