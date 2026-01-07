import { z } from 'zod'

import type { CommandDefinition } from '../ControlApi.js'

import { MODAL_IDS } from '../modal-ids.js'
import { successSchema } from '../shared-schemas.js'

const modalIdSchema = z.enum(MODAL_IDS)

export const closeModalCommand = {
	group: 'misc',
	kind: 'write',
	description: 'Closes a specific global modal by id.',
	input: z
		.object({
			id: modalIdSchema.describe('Modal id to close'),
		})
		.strict()
		.describe('Input parameters for closing a modal'),
	output: successSchema.describe('Success response indicating the modal was closed'),
} satisfies CommandDefinition
