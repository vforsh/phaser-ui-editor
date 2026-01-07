import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

export const getPrefabContentCommand = {
	group: 'objects',
	kind: 'read',
	description: 'Gets the root prefab content JSON for the currently open prefab.',
	input: z.object({}).strict().describe('Input parameters for getting prefab content (empty)'),
	output: z.unknown().describe('Editable container JSON for the current prefab root'),
} satisfies CommandDefinition
