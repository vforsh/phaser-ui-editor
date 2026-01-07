import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const patchObjectCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Applies a whitelisted patch to an object state.',
	input: z
		.object({
			target: objectSelectorV0Schema,
			patch: z.record(z.unknown()).describe('Patch object with whitelisted fields'),
		})
		.strict()
		.describe('Input parameters for patching an object'),
	output: okResultSchema.describe('Result indicating whether the object patch was applied'),
} satisfies CommandDefinition
