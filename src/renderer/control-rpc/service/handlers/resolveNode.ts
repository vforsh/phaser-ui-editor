import type { resolveNodeCommand } from '../../api/commands/resolveNode'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link resolveNodeCommand} for command definition
 */
export const resolveNode: CommandHandler<'resolveNode'> = (_ctx) => async (params) => {
	const resolved = resolveNodeSelectorV0(params.target)
	if (!resolved.ok) {
		throw new Error(resolved.error.message)
	}

	const obj = state.canvas.objectById(resolved.id)
	if (!obj) {
		throw new Error(`object not found for id '${resolved.id}'`)
	}

	return {
		runtimeId: obj.id,
		name: obj.name,
		type: obj.type,
	}
}
