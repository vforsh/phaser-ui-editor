import type { focusOnObjectCommand } from '@tekton/control-rpc-contract/commands/focusOnObject'

import type { CommandHandler } from '../types'

/**
 * @see {@link focusOnObjectCommand} for command definition
 */
export const focusOnObject: CommandHandler<'focusOnObject'> = (ctx) => async (params) => {
	ctx.appCommands.emit('focus-on-object', params)
	return { success: true }
}
