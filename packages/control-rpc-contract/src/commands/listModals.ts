import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { MODAL_IDS } from '../modal-ids.js'

const modalIdSchema = z.enum(MODAL_IDS)

const modalEntrySchema = z
	.object({
		id: modalIdSchema.describe('Modal id'),
		isOpen: z.boolean().describe('Whether the modal is currently open'),
	})
	.strict()

export const listModalsCommand = {
	group: 'misc',
	kind: 'read',
	description: 'Lists all known global modals and their open/closed status.',
	input: z.object({}).strict().describe('Input parameters for listing modals (empty)'),
	output: z
		.object({
			activeModalId: modalIdSchema.nullable().describe('Currently active modal id, or null if none are open'),
			modals: z.array(modalEntrySchema).describe('List of modal ids and their open state'),
		})
		.strict()
		.describe('Modal listing result'),
} satisfies CommandDefinition
