import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

export const patchObjectComponentCommand = {
	group: 'objects',
	description: 'Applies a patch to a component state on the target object.',
	input: z
		.object({
			target: nodeSelectorV0Schema.describe('Target node selector'),
			component: z
				.union([
					z
						.object({
							id: z.string().min(1).describe('Component runtime identifier'),
						})
						.strict(),
					z
						.object({
							type: z.string().min(1).describe('Component type identifier'),
						})
						.strict(),
				])
				.describe('Component selector by id or type'),
			patch: z.record(z.unknown()).describe('Patch object with component fields'),
		})
		.strict()
		.describe('Input parameters for patching a component'),
	output: okResultSchema.describe('Result indicating whether the component patch was applied'),
} satisfies CommandDefinition
