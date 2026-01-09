import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { instanceRecordSchema } from '../discovery/InstanceRecord.js'

export const pingCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Checks that the control RPC server is reachable and returns instance metadata.',
	input: z.object({}).strict().describe('Input parameters for ping (empty)'),
	output: instanceRecordSchema.describe('Running editor instance metadata.'),
} satisfies CommandDefinition
