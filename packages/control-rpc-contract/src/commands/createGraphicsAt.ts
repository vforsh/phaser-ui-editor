import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { objectSelectorV0Schema, okCreatedIdResultSchema } from '../shared-schemas.js'

const graphicsShapeSchema = z.enum(['rectangle', 'ellipse'])

export const createGraphicsAtCommand = {
	group: 'objects',
	kind: 'write',
	description: 'Creates a new Graphics object at the provided canvas position.',
	input: z
		.object({
			parent: objectSelectorV0Schema,
			shape: graphicsShapeSchema.describe('Graphics shape type'),
			position: z
				.object({
					x: z.number().finite().describe('Canvas X coordinate'),
					y: z.number().finite().describe('Canvas Y coordinate'),
				})
				.strict()
				.describe('Canvas position for the new object'),
		})
		.strict()
		.describe('Input parameters for creating a Graphics object at a position'),
	output: okCreatedIdResultSchema.describe('Result indicating whether the object was created'),
} satisfies CommandDefinition
