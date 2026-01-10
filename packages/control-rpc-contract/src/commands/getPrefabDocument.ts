import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

export const getPrefabDocumentCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Returns the current prefab document (expanded runtime JSON + collapsed prefab JSON).',
	input: z.object({}).strict().describe('No input parameters'),
	output: z
		.object({
			expanded: z.unknown().describe('Expanded runtime JSON (prefab instances resolved)'),
			collapsed: z.unknown().describe('Collapsed prefab JSON (prefab instances as PrefabInstance nodes)'),
		})
		.strict()
		.describe('Prefab document payload'),
} satisfies CommandDefinition
