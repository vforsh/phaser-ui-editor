import type { createObjectCommand } from '../../api/commands/createObject'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link createObjectCommand} for command definition
 */
export const createObject: CommandHandler<'createObject'> = (ctx) => async (params) => {
	const resolved = resolveNodeSelectorV0(params.parent)
	if (!resolved.ok) {
		return resolved
	}

	const parent = state.canvas.objectById(resolved.id)
	if (!parent) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${resolved.id}'` },
		}
	}

	ctx.appCommands.emit('create-object', { clickedObjId: parent.id, type: params.type })
	return { ok: true }
}
