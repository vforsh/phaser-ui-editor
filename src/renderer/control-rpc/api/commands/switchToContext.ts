import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const switchToContextCommand = {
	group: 'misc',
	description:
		'Switches the editor to a different context (e.g., another scene or prefab), identified by ID or path.',
	input: z
		.union([
			z
				.object({
					id: z.string().min(1).describe('Unique identifier of the context'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Project-relative path to the context file'),
				})
				.strict(),
		])
		.describe('Input parameters for switching context (ID or path)'),
	output: successSchema.describe('Success response indicating the context was switched'),
} satisfies CommandDefinition
