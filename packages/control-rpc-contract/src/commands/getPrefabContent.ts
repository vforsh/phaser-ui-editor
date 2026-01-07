import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'

export const getPrefabContentCommand = {
	group: 'objects',
	description: 'Gets the root prefab content JSON for the currently open prefab.',
	input: z.object({}).strict().describe('Input parameters for getting prefab content (empty)'),
	output: z.unknown().describe('Editable container JSON for the current prefab root'),
} satisfies CommandDefinition
