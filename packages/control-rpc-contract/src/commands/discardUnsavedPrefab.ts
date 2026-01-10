import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const discardUnsavedPrefabCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Discards unsaved changes in the currently opened prefab.',
	input: z.object({}).strict().describe('No input parameters'),
	output: successSchema.describe('Standard success response'),
} satisfies CommandDefinition
