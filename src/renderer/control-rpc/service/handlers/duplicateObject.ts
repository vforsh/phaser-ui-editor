import type { duplicateObjectCommand } from '@tekton/control-rpc-contract/commands/duplicateObject'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link duplicateObjectCommand} for command definition
 */
export const duplicateObject: CommandHandler<'duplicateObject'> = (ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.target)
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
