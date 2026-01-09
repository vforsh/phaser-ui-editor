import type { AssetNode, AssetType } from '@tekton/control-rpc-contract'
import type { listAssetsTreeCommand } from '@tekton/control-rpc-contract/commands/listAssetsTree'

import type { AssetTreeItemData } from '../../../types/assets'
import type { CommandHandler } from '../types'

import { state, unproxy } from '../../../state/State'
import { findAssetByPath, normalizeAssetPaths, pruneAssetByType } from '../utils/assets'

/**
 * @see {@link listAssetsTreeCommand} for command definition
 */
export const listAssetsTree: CommandHandler<'listAssetsTree'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const requestedTypes = params.types?.length ? new Set<AssetType>(params.types) : undefined
	const allAssets = unproxy(state.assets.items) as AssetTreeItemData[]

	let roots: AssetTreeItemData[] = []
	if (params.path) {
		const subtreeRoot = findAssetByPath(allAssets, params.path, state.projectDir)
		if (!subtreeRoot) {
			throw new Error(`asset not found for path '${params.path}'`)
		}
		roots = [subtreeRoot]
	} else {
		roots = allAssets
	}

	const normalized = roots.map((asset) => normalizeAssetPaths(asset, state.projectDir!))

	const filtered = requestedTypes
		? normalized.map((asset) => pruneAssetByType(asset, requestedTypes)).filter((asset): asset is AssetNode => Boolean(asset))
		: (normalized as unknown as AssetNode[])

	return { assets: filtered }
}
