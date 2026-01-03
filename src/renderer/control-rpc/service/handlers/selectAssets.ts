import { P, match } from 'ts-pattern'
import { state } from '../../../state/State'
import { getAssetById } from '../../../types/assets'
import { findAssetByPath } from '../utils/assets'
import type { CommandHandler } from '../types'
import type { selectAssetsCommand } from '../../api/commands/selectAssets'

/**
 * @see {@link selectAssetsCommand} for command definition
 */
export const selectAssets: CommandHandler<'selectAssets'> = (_ctx) => async (params) => {
	if (!state.projectDir) {
		throw new Error('no project is open')
	}

	const idsToSelect: string[] = []

	for (const assetRef of params.assets) {
		const id = match(assetRef)
			.with({ id: P.string }, ({ id }) => {
				const asset = getAssetById(state.assets.items, id)
				if (!asset) {
					throw new Error(`asset not found for id '${id}'`)
				}
				return id
			})
			.with({ path: P.string }, ({ path }) => {
				const asset = findAssetByPath(state.assets.items, path, state.projectDir!)
				if (!asset) {
					throw new Error(`asset not found for path '${path}'`)
				}
				return asset.id
			})
			.exhaustive()

		idsToSelect.push(id)
	}

	state.assets.selection = idsToSelect
	state.assets.selectionChangedAt = Date.now()
	state.assets.focusPanel?.()

	return { assetIds: idsToSelect }
}
