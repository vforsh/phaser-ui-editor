import type { listEditorsCommand } from '@tekton/control-rpc-contract/commands/listEditors'

import type { CommandHandler } from '../types'

/**
 * @see {@link listEditorsCommand} for command definition
 */
export const listEditors: CommandHandler<'listEditors'> = (_ctx) => async () => {
	throw new Error('listEditors is only available via the external control RPC')
}
