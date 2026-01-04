import type { selectNodeCommand } from '../../api/commands/selectNode'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link selectNodeCommand} for command definition
 */
export const selectNode: CommandHandler<'selectNode'> = (ctx) => async (params) => {
	const resolved = resolveNodeSelectorV0(params.target)
	if (!resolved.ok) {
		return resolved
	}

	const obj = state.canvas.objectById(resolved.id)
	if (!obj) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${resolved.id}'` },
		}
	}

	ctx.appCommands.emit('select-object', obj.id)
	return { ok: true }
}
