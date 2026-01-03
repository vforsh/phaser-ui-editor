import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const getSelectedAssetsCommand = {
	group: 'assets',
	description: 'Retrieves the IDs of the currently selected assets.',
	input: z.object({}).strict().describe('Empty input for getting selected assets'),
	output: z
		.object({
			ids: z.array(z.string()).describe('List of unique identifiers for the currently selected assets'),
		})
		.strict()
		.describe('Response containing the selected asset IDs'),
} satisfies CommandDefinition
