import type { pingCommand } from '@tekton/control-rpc-contract/commands/ping'

import type { CommandHandler } from '../types'

/**
 * @see {@link pingCommand} for command definition
 */
export const ping: CommandHandler<'ping'> = (_ctx) => async () => {
	throw new Error('ping is only available via the external control RPC')
}
