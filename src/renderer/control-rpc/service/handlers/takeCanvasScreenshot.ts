import type { CommandHandler } from '../types'

/**
 * @see {@link import('../../api/commands/takeCanvasScreenshot').takeCanvasScreenshotCommand} for command definition
 */
export const takeCanvasScreenshot: CommandHandler<'takeCanvasScreenshot'> = (ctx) => async (params) => {
	const savedPath = await ctx.appCommands.emit('take-canvas-screenshot', {
		clean: params.clean,
		format: params.format,
	})
	if (!savedPath) {
		throw new Error('failed to take canvas screenshot')
	}

	return { path: savedPath }
}
