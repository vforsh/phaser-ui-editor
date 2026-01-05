import type { createObjectFromAssetCommand } from '../../api/commands/createObject'
import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { getAssetById } from '../../../types/assets'
import { resolveObjectSelectorV0 } from '../utils/resolve-object-selector'

const SUPPORTED_ASSET_TYPES = ['image', 'spritesheet-frame', 'prefab', 'web-font', 'bitmap-font'] as const
type SupportedAssetType = (typeof SUPPORTED_ASSET_TYPES)[number]

function isSupportedAssetType(type: string): type is SupportedAssetType {
	return (SUPPORTED_ASSET_TYPES as readonly string[]).includes(type)
}

/**
 * @see {@link createObjectFromAssetCommand} for command definition
 */
export const createObjectFromAsset: CommandHandler<'createObjectFromAsset'> = (ctx) => async (params) => {
	const resolved = resolveObjectSelectorV0(params.parent)
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

	const asset = getAssetById(state.assets.items, params.assetId)
	if (!asset) {
		return {
			ok: false,
			error: { kind: 'validation', message: `asset '${params.assetId}' not found` },
		}
	}

	if (!isSupportedAssetType(asset.type)) {
		return {
			ok: false,
			error: {
				kind: 'validation',
				message: `asset '${params.assetId}' type '${asset.type}' cannot be used to create an object`,
			},
		}
	}

	ctx.appCommands.emit('select-object', parent.id)
	ctx.appCommands.emit('handle-asset-drop', {
		asset,
		position: params.position ?? { x: 0, y: 0 },
	})

	return { ok: true }
}
