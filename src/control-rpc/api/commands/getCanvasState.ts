import { z } from 'zod'
import { CommandDefinition } from '../ControlApi'

export const getCanvasStateCommand = {
	group: 'misc',
	description: 'Gets the current canvas state (selection, prefab, unsaved changes, camera).',
	input: z.object({}).strict().describe('Input parameters for getting canvas state (empty)'),
	output: z
		.object({
			currentPrefab: z
				.object({
					id: z.string().min(1),
					name: z.string().min(1),
				})
				.optional(),
			activeContextId: z.string().min(1).optional(),
			selectionIds: z.array(z.string().min(1)),
			hasUnsavedChanges: z.boolean(),
			camera: z
				.object({
					zoom: z.number().positive(),
					scrollX: z.number(),
					scrollY: z.number(),
				})
				.strict(),
		})
		.strict(),
} satisfies CommandDefinition
