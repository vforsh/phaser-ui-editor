import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const getCanvasMetricsCommand = {
	group: 'misc',
	description: 'Gets current canvas DOM metrics and rendering status.',
	input: z.object({}).strict().describe('Input parameters for getting canvas metrics (empty)'),
	output: z
		.object({
			width: z.number().int().nonnegative().describe('Actual width of the canvas element in pixels'),
			height: z.number().int().nonnegative().describe('Actual height of the canvas element in pixels'),
			isConnected: z.boolean().describe('Whether the canvas element is currently connected to the DOM'),
			currentPrefabAssetId: z.string().optional().describe('The ID of the currently opened prefab asset, if any'),
		})
		.strict(),
} satisfies CommandDefinition
