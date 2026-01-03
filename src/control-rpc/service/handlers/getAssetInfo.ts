import { P, match } from 'ts-pattern'
import { state, unproxy } from '../../../state/State'
import type { AssetTreeItemData } from '../../../types/assets'
import { getAssetById } from '../../../types/assets'
import type { CommandHandler } from '../types'
import { findAssetByPath, normalizeAssetPaths } from '../utils/assets'
import type { getAssetInfoCommand } from '../../api/commands/getAssetInfo'

/**
 * @see {@link getAssetInfoCommand} for command definition
 */
export const getAssetInfo: CommandHandler<'getAssetInfo'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const id = match(params)
		.with({ id: P.string }, ({ id }) => id)
		.with({ path: P.string }, ({ path }) => {
			const asset = findAssetByPath(state.assets.items, path, state.projectDir!)
			if (!asset) {
				throw new Error(`asset not found for path '${path}'`)
			}
			return asset.id
		})
		.exhaustive()

	const assetData = getAssetById(state.assets.items, id)
	if (!assetData) {
		throw new Error(`asset not found for id '${id}'`)
	}

	return normalizeAssetPaths(unproxy(assetData) as AssetTreeItemData, state.projectDir)
}
