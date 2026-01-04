import type { AssetTreeItemData } from '../../../types/assets'
import type { listAssetsCommand } from '../../api/commands/listAssets'
import type { AssetNode, AssetType } from '../../api/ControlApi'
import type { CommandHandler } from '../types'

import { state, unproxy } from '../../../state/State'
import { normalizeAssetPaths, pruneAssetByType } from '../utils/assets'

/**
 * @see {@link listAssetsCommand} for command definition
 */
export const listAssets: CommandHandler<'listAssets'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const requestedTypes = params.types?.length ? new Set<AssetType>(params.types) : undefined
	const assets = unproxy(state.assets.items) as AssetTreeItemData[]
	const normalized = assets.map((asset) => normalizeAssetPaths(asset, state.projectDir!))

	const filtered = requestedTypes
		? normalized.map((asset) => pruneAssetByType(asset, requestedTypes)).filter((asset): asset is AssetNode => Boolean(asset))
		: (normalized as unknown as AssetNode[])

	return { assets: filtered }
}
