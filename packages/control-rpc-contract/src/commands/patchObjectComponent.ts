import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okResultSchema } from '../shared-schemas.js'

export const patchObjectComponentCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Applies a patch to a component state on the target object.',
	input: z
		.object({
			target: objectSelectorV0Schema,
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
