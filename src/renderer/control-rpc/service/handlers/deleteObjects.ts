import type { deleteObjectsCommand } from '@tekton/control-rpc-contract/commands/deleteObjects'

import type { CommandHandler } from '../types'

/**
 * @see {@link deleteObjectsCommand} for command definition
 */
export const deleteObjects: CommandHandler<'deleteObjects'> = (ctx) => async (params) => {
	if (!Array.isArray(params.ids) || params.ids.length === 0) {
		throw new Error('deleteObjects requires a non-empty ids array')
	}

	ctx.appCommands.emit('delete-objects', params.ids)
	return { success: true }
}
