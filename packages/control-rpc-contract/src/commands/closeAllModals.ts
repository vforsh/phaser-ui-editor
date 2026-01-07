import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { successSchema } from '../shared-schemas.js'

export const closeAllModalsCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Closes any active global modal.',
	input: z.object({}).strict().describe('Input parameters for closing all modals (empty)'),
	output: successSchema.describe('Success response indicating all modals were closed'),
} satisfies CommandDefinition
