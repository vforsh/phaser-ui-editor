import type { closeModalCommand } from '@tekton/control-rpc-contract/commands/closeModal'

import type { CommandHandler } from '../types'

/**
 * @see {@link closeModalCommand} for command definition
 */
export const closeModal: CommandHandler<'closeModal'> = (ctx) => async (params) => {
	ctx.appCommands.emit('close-modal', params)
	return { success: true }
}
