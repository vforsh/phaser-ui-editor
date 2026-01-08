import type { createGraphicsAtCommand } from '@tekton/control-rpc-contract/commands/createGraphicsAt'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link createGraphicsAtCommand} for command definition
 */
export const createGraphicsAt: CommandHandler<'createGraphicsAt'> = (ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.parent)
	if (!resolved.ok) {
		return { ok: false, error: resolved.error }
	}

	const parent = state.canvas.objectById(resolved.id)
	if (!parent) {
		return {
			ok: false,
			error: { kind: 'validation', message: `object not found for id '${resolved.id}'` },
		}
	}

	const createdId = ctx.appCommands.emit('create-graphics-at', {
		shape: params.shape,
		parentId: parent.id,
		canvasPos: params.position,
	})

	if (!createdId) {
		return {
			ok: false,
			error: { kind: 'internal', message: 'failed to create graphics object' },
		}
	}

	return { ok: true, createdId }
}
