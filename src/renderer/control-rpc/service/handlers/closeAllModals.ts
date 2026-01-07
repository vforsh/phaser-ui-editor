import type { closeAllModalsCommand } from '@tekton/control-rpc-contract/commands/closeAllModals'

import type { CommandHandler } from '../types'

/**
 * @see {@link closeAllModalsCommand} for command definition
 */
export const closeAllModals: CommandHandler<'closeAllModals'> = (ctx) => async () => {
	ctx.appCommands.emit('close-all-modals')
	return { success: true }
}
