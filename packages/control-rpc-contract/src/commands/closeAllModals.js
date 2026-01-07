import { z } from 'zod'

import { successSchema } from '../shared-schemas'
export const closeAllModalsCommand = {
	group: 'misc',
	description: 'Closes any active global modal.',
	input: z.object({}).strict().describe('Input parameters for closing all modals (empty)'),
	output: successSchema.describe('Success response indicating all modals were closed'),
}
//# sourceMappingURL=closeAllModals.js.map
