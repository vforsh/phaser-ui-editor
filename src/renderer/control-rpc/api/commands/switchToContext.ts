import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

export const switchToContextCommand = {
	group: 'misc',
	description:
		'Switches the canvas edit context to the specified Container. Provide the container object id directly, or an object hierarchy path (e.g. "/Root/Group[0]").',
	input: z
		.union([
			z
				.object({
					id: z.string().min(1).describe('Object id of the Container to switch to'),
				})
				.strict(),
			z
				.object({
					path: z.string().min(1).describe('Object hierarchy path to a Container within the currently open prefab'),
				})
				.strict(),
		])
		.describe('Input parameters for switching canvas edit context (container id or object path)'),
	output: successSchema.describe('Success response indicating the context was switched'),
} satisfies CommandDefinition
