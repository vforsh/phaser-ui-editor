import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const getCanvasMetricsCommand = {
	group: 'misc',
	description: 'Gets current canvas DOM metrics and rendering status.',
	input: z.object({}).strict().describe('Input parameters for getting canvas metrics (empty)'),
	output: z
		.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			isConnected: z.boolean(),
			currentPrefabAssetId: z.string().optional(),
		})
		.strict(),
} satisfies CommandDefinition
