import { z } from 'zod'

import { CommandDefinition } from '../ControlApi'
import { MODAL_IDS } from '../modal-ids'
import { successSchema } from '../shared-schemas'

const modalIdSchema = z.enum(MODAL_IDS)

export const closeModalCommand = {
	group: 'misc',
	description: 'Closes a specific global modal by id.',
	input: z
		.object({
			id: modalIdSchema.describe('Modal id to close'),
		})
		.strict()
		.describe('Input parameters for closing a modal'),
	output: successSchema.describe('Success response indicating the modal was closed'),
} satisfies CommandDefinition
