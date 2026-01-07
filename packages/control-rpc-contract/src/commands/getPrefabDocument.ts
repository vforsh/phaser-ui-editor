import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

export const getPrefabDocumentCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Returns the current prefab document (expanded JSON stub).',
	input: z.object({}).strict().describe('No input parameters'),
	output: z
		.object({
			kind: z.literal('expanded').describe('Document kind'),
			content: z.unknown().describe('Expanded prefab content JSON'),
		})
		.strict()
		.describe('Prefab document payload'),
} satisfies CommandDefinition
