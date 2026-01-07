import type { openPrefabCommand } from '@tekton/control-rpc-contract/commands/openPrefab'

import { P, match } from 'ts-pattern'

import type { CommandHandler } from '../types'

import { state } from '../../../state/State'
import { findAssetByPath } from '../utils/assets'

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
	if (!state.projectDir) {
		return undefined
	}

	const asset = findAssetByPath(state.assets.items, prefabPath, state.projectDir)
	if (!asset || asset.type !== 'prefab') {
		return undefined
	}

	return asset.id
}
