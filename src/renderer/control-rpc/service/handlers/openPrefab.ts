import { P, match } from 'ts-pattern'
import { state } from '../../../state/State'
import { getAssetsOfType } from '../../../types/assets'
import type { openPrefabCommand } from '../../api/commands/openPrefab'
import type { CommandHandler } from '../types'

/**
 * @see {@link openPrefabCommand} for command definition
 */
export const openPrefab: CommandHandler<'openPrefab'> = (ctx) => async (params) => {
	const assetId = match(params)
		.with({ assetId: P.string }, ({ assetId }) => assetId)
		.with({ path: P.string }, ({ path }) => resolvePrefabIdByPath(path))
		.exhaustive()

	if (!assetId) {
		throw new Error('openPrefab requires assetId or a valid prefab path')
	}

	ctx.appCommands.emit('open-prefab', assetId)
	return { success: true }
}

function resolvePrefabIdByPath(prefabPath: string): string | undefined {
	const prefabAssets = getAssetsOfType(state.assets.items, 'prefab')
	const asset = prefabAssets.find((item) => item.path === prefabPath)
	return asset?.id
}
