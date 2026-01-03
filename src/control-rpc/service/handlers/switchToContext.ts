import { P, match } from 'ts-pattern'
import { state } from '../../../state/State'
import type { ControlInput } from '../../api/ControlApi'
import type { CommandHandler } from '../types'
import { resolveObjectIdByPath } from '../utils/object-path'
import type { switchToContextCommand } from '../../api/commands/switchToContext'

/**
 * @see {@link switchToContextCommand} for command definition
 */
export const switchToContext: CommandHandler<'switchToContext'> = (ctx) => async (params) => {
	const id = resolveObjectId(params)
	ctx.appCommands.emit('switch-to-context', id)
	return { success: true }
}

function resolveObjectId(params: ControlInput<'switchToContext'>): string {
	const id = match(params)
		.with({ id: P.string }, ({ id }) => id)
		.with({ path: P.string }, ({ path }) => {
			const root = state.canvas.root
			if (!root) {
				throw new Error('no prefab is open')
			}
			const resolvedId = resolveObjectIdByPath(root, path)
			if (!resolvedId) {
				throw new Error(`object not found for path '${path}'`)
			}
			return resolvedId
		})
		.exhaustive()

	return id
}
