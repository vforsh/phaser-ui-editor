import type { AssetNode } from '@tekton/control-rpc-contract'

import type { AssetTreeItemData } from '../../../types/assets'
import type { CommandHandler } from '../types'

import { state, unproxy } from '../../../state/State'
import { collectAssetsOfType, normalizeAssetPaths } from '../utils/assets'

/**
 * @see {@link listAssetsOfTypeCommand} for command definition
 */
export const listAssetsOfType: CommandHandler<'listAssetsOfType'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const { type } = params
	const assets = unproxy(state.assets.items) as AssetTreeItemData[]
	const normalized = assets.map((asset) => normalizeAssetPaths(asset, state.projectDir!))

	const matches: AssetNode[] = []
	for (const root of normalized) {
		collectAssetsOfType(root, type, matches)
	}

	return matches
}
