import type { duplicateObjectCommand } from '../../api/commands/duplicateObject'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link duplicateObjectCommand} for command definition
 */
export const duplicateObject: CommandHandler<'duplicateObject'> = (ctx) => async (params) => {
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

	ctx.appCommands.emit('duplicate-object', obj.id)
	return { ok: true }
}
