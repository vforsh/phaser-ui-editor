import type { setCameraCommand } from '../../api/commands/setCamera'
import type { CommandHandler } from '../types'

/**
 * @see {@link setCameraCommand} for command definition
 */
export const setCamera: CommandHandler<'setCamera'> = (ctx) => async (params) => {
	ctx.appCommands.emit('set-camera', params)
	return { success: true }
}
