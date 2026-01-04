import type { moveObjectInHierarchyCommand } from '../../api/commands/moveObjectInHierarchy'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link moveObjectInHierarchyCommand} for command definition
 */
export const moveObjectInHierarchy: CommandHandler<'moveObjectInHierarchy'> = (ctx) => async (params) => {
	const target = resolveNodeSelectorV0(params.target)
	if (!target.ok) {
		return target
	}

	const parent = resolveNodeSelectorV0(params.newParent)
	if (!parent.ok) {
		return parent
	}

	const targetObj = state.canvas.objectById(target.id)
	if (!targetObj) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${target.id}'` },
		}
	}

	const parentObj = state.canvas.objectById(parent.id)
	if (!parentObj) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${parent.id}'` },
		}
	}

	ctx.appCommands.emit('move-object-in-hierarchy', targetObj.id, parentObj.id, params.newIndex)
	return { ok: true }
}
