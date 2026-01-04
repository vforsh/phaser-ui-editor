import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const setObjectPatchCommand = {
	group: 'objects',
	description: 'Applies a whitelisted patch to an object state.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
			patch: z.record(z.unknown()).describe('Patch object with whitelisted fields'),
		})
		.strict()
		.describe('Input parameters for patching an object'),
	output: okResultSchema.describe('Result indicating whether the object patch was applied'),
} satisfies CommandDefinition
