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
							wsUrl: z
								.string()
								.describe(
									'WebSocket JSON-RPC address for this editor instance (e.g. ws://127.0.0.1:17870)'
								),
							wsPort: z.number().describe('WebSocket port for this editor instance'),
							appLaunchDir: z
								.string()
								.describe('Directory the editor app instance was launched from (process.cwd())'),
							projectPath: z.string().nullable().describe('Path to the project open in this window'),
						})
						.strict()
				)
				.describe('List of active editor windows'),
		})
		.strict()
		.describe('Response containing the list of editors'),
} satisfies CommandDefinition
