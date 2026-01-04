import type { createPrefabInstanceCommand } from '../../api/commands/createPrefabInstance'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { getAssetById } from '../../../types/assets'
import { resolveNodeSelectorV0 } from '../utils/resolve-node-selector'

/**
 * @see {@link createPrefabInstanceCommand} for command definition
 */
export const createPrefabInstance: CommandHandler<'createPrefabInstance'> = (ctx) => async (params) => {
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

	const asset = getAssetById(state.assets.items, params.prefabAssetId)
	if (!asset) {
		return {
			ok: false,
			error: { kind: 'validation', message: `prefab asset '${params.prefabAssetId}' not found` },
		}
	}

	if (asset.type !== 'prefab') {
		return {
			ok: false,
			error: { kind: 'validation', message: `asset '${params.prefabAssetId}' is not a prefab` },
		}
	}

	ctx.appCommands.emit('select-object', parent.id)
	ctx.appCommands.emit('handle-asset-drop', {
		asset,
		position: params.position ?? { x: 0, y: 0 },
	})

	return { ok: true }
}
