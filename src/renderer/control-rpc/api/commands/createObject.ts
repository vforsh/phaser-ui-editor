import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { nodeSelectorV0Schema, okResultSchema } from '../shared-schemas'

const editableObjectTypeSchema = z.enum(['Container', 'Image', 'NineSlice', 'Text', 'BitmapText'])

export const createObjectCommand = {
	group: 'objects',
	description: 'Creates a new object under the provided parent node.',
	input: z
		.object({
			parent: nodeSelectorV0Schema.describe('Parent node selector'),
			type: editableObjectTypeSchema.describe('Type of object to create'),
		})
		.strict()
		.describe('Input parameters for creating an object'),
	output: okResultSchema.describe('Result indicating whether the object was created'),
} satisfies CommandDefinition
