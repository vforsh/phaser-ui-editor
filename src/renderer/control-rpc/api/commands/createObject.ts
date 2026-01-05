import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { objectSelectorV0Schema, okCreatedIdResultSchema } from '../shared-schemas'

const editableObjectTypeSchema = z.enum(['Container', 'Image', 'NineSlice', 'Text', 'BitmapText'])

export const createObjectCommand = {
	group: 'objects',
	description: 'Creates a new object under the provided parent node.',
	input: z
		.object({
			parent: objectSelectorV0Schema,
			type: editableObjectTypeSchema.describe('Type of object to create'),
		})
		.strict()
		.describe('Input parameters for creating an object'),
	output: okCreatedIdResultSchema.describe('Result indicating whether the object was created'),
} satisfies CommandDefinition

export const createObjectFromAssetCommand = {
	group: 'objects',
	description: 'Creates a new object from an asset (using the same pipeline as asset drop).',
	input: z
		.object({
			parent: objectSelectorV0Schema,
			assetId: z.string().min(1).describe('Asset id'),
			position: z
				.object({
					x: z.number().finite().describe('Canvas X coordinate'),
					y: z.number().finite().describe('Canvas Y coordinate'),
				})
				.strict()
				.optional()
				.describe('Optional drop position'),
		})
		.strict()
		.describe('Input parameters for creating an object from an asset'),
	output: okCreatedIdResultSchema.describe('Result indicating whether the object was created'),
} satisfies CommandDefinition
