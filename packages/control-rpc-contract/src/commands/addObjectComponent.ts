import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const addObjectComponentCommand = {
	group: 'objects',
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
