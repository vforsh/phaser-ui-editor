import type { CommandHandler } from '../types'
import type { setCameraCommand } from '../../api/commands/setCamera'

/**
 * @see {@link setCameraCommand} for command definition
 */
export const setCamera: CommandHandler<'setCamera'> = (ctx) => async (params) => {
	ctx.appCommands.emit('set-camera', params)
	return { success: true }
}
