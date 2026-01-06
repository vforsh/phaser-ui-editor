import type { listModalsCommand } from '../../api/commands/listModals'
import type { CommandHandler } from '../types'

/**
 * @see {@link listModalsCommand} for command definition
 */
export const listModals: CommandHandler<'listModals'> = (ctx) => async () => {
	const result = ctx.appCommands.emit('list-modals')

	if (!result) {
		throw new Error('Modal service is not initialized yet')
	}

	return result
}
