import type { createObjectCommand } from '@tekton/control-rpc-contract/commands/createObject'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { isIdInPrefabDocument, waitForDocumentRevisionBump } from '../utils/canvasDocument'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

/**
 * @see {@link createObjectCommand} for command definition
 */
export const createObject: CommandHandler<'createObject'> = (ctx) => async (params) => {
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

	if (!isIdInPrefabDocument(state.canvas.root, parent.id)) {
		return {
			ok: false,
			error: { kind: 'validation', message: 'parent is not part of the prefab document' },
		}
	}

	const beforeRevision = state.canvas.documentRevision

	const createdId = ctx.appCommands.emit('create-object', { clickedObjId: parent.id, type: params.type })
	if (!createdId) {
		return {
			ok: false,
			error: { kind: 'internal', message: 'failed to create object' },
		}
	}

	const didBump = await waitForDocumentRevisionBump(beforeRevision, { timeoutMs: 3000 })
	if (!didBump) {
		return {
			ok: false,
			error: {
				kind: 'internal',
				message: 'object created but document did not update (timeout)',
			},
		}
	}

	return { ok: true, createdId }
}
