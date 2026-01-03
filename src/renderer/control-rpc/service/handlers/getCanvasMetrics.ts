import type { CommandHandler } from '../types'

/**
 * @see {@link getCanvasMetricsCommand} for command definition
 */
export const getCanvasMetrics: CommandHandler<'getCanvasMetrics'> = (ctx) => async () => {
	const result = ctx.appCommands.emit('get-canvas-metrics')

	if (!result) {
		throw new Error('Canvas not found or not initialized')
	}

	return result
}
