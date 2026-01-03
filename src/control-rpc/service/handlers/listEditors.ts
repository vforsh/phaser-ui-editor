import type { CommandHandler } from '../types'
import type { listEditorsCommand } from '../../api/commands/listEditors'

/**
 * @see {@link listEditorsCommand} for command definition
 */
export const listEditors: CommandHandler<'listEditors'> = (_ctx) => async () => {
	throw new Error('listEditors is only available via the external control RPC')
}
