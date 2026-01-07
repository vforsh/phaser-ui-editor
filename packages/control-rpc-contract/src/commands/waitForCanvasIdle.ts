import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { okResultSchema } from '../shared-schemas.js'

export const waitForCanvasIdleCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Waits until the canvas state becomes idle (prefab loaded and selections stabilized).',
	input: z
		.object({
			timeoutMs: z.number().int().positive().optional().describe('Max wait time in milliseconds'),
			pollMs: z.number().int().positive().optional().describe('Polling interval in milliseconds'),
		})
		.strict()
		.describe('Input parameters for waiting until the canvas is idle'),
	output: okResultSchema.describe('Result indicating whether the canvas reached an idle state'),
} satisfies CommandDefinition
