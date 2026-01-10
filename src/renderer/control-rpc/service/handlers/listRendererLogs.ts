import type { listRendererLogsCommand } from '@tekton/control-rpc-contract/commands/listRendererLogs'

import type { CommandHandler } from '../types'

/**
 * @see {@link listRendererLogsCommand} for command definition
 */
export const listRendererLogs: CommandHandler<'listRendererLogs'> = (_ctx) => async () => {
	throw new Error('listRendererLogs is only available via the external control RPC')
}
