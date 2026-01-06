import type { openModalCommand } from '../../api/commands/openModal'
import type { CommandHandler } from '../types'

/**
 * @see {@link openModalCommand} for command definition
 */
export const openModal: CommandHandler<'openModal'> = (ctx) => async (params) => {
	ctx.appCommands.emit('open-modal', params)
	return { success: true }
}
