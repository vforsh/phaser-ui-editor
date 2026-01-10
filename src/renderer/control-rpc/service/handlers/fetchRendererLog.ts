import type { fetchRendererLogCommand } from '@tekton/control-rpc-contract/commands/fetchRendererLog'

import type { CommandHandler } from '../types'

/**
 * @see {@link fetchRendererLogCommand} for command definition
 */
export const fetchRendererLog: CommandHandler<'fetchRendererLog'> = (_ctx) => async () => {
	throw new Error('fetchRendererLog is only available via the external control RPC')
}
