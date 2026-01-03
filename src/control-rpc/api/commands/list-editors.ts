import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const listEditorsCommand = {
	group: 'misc',
	description: 'Lists all currently running editor windows and their associated projects.',
	input: z.object({}).strict().describe('Input parameters for listing editors (empty)'),
	output: z
		.object({
			editors: z
				.array(
					z
						.object({
							windowId: z.number().describe('Unique ID of the editor window'),
							projectPath: z.string().nullable().describe('Path to the project open in this window'),
						})
						.strict()
				)
				.describe('List of active editor windows'),
		})
		.strict()
		.describe('Response containing the list of editors'),
} satisfies CommandDefinition
