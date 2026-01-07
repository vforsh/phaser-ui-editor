import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const addObjectComponentCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Adds a component to the target object and applies optional overrides.',
	input: z
		.object({
			target: objectSelectorV0Schema,
			componentJson: z
				.object({
					type: z.string().min(1).describe('Component type identifier'),
				})
				.passthrough()
				.describe('Inspector-style component state overrides'),
		})
		.strict()
		.describe('Input parameters for adding a component to an object'),
	output: okResultSchema.describe('Result indicating whether the component was added'),
} satisfies CommandDefinition
