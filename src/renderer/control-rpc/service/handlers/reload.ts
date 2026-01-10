import type { reloadCommand } from '@tekton/control-rpc-contract/commands/reload'

import type { CommandHandler } from '../types'

/**
 * @see {@link reloadCommand} for command definition
 */
export const reload: CommandHandler<'reload'> = (_ctx) => async () => {
	throw new Error('reload is only available via the external control RPC')
}
