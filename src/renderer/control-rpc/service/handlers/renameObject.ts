import type { renameObjectCommand } from '@tekton/control-rpc-contract/commands/renameObject'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link renameObjectCommand} for command definition
 */
export const renameObject: CommandHandler<'renameObject'> = (ctx) => async (params) => {
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

	ctx.appCommands.emit('rename-object', { objectId: resolved.id, name: params.name })
	return { ok: true }
}
