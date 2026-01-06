import { findAssetByPath } from '../control-rpc/service/utils/assets'
import { logger } from '../logs/logs'
import { state } from '../state/State'
import { getAssetById } from '../types/assets'
import { UrlParams } from './UrlParams'

let consumed = false

type Options = {
	projectDir: string
}

export function maybeSeedInitialPrefabFromUrlParams({ projectDir }: Options): void {
	if (consumed) {
		return
	}

	consumed = true

	const projectPath = UrlParams.get('projectPath')
	if (!projectPath) {
		return
	}

	const prefabIdParam = UrlParams.get('prefabId')
	const prefabPathParam = UrlParams.get('prefabPath')

	if (!prefabIdParam && !prefabPathParam) {
		return
	}

	const urlParamsLogger = logger.getOrCreate('url-params')

	if (prefabIdParam) {
		const asset = getAssetById(state.assets.items, prefabIdParam)
		if (!asset) {
			urlParamsLogger.warn('[prefab-auto-open] prefabId not found in assets', { prefabId: prefabIdParam })
			return
		}

		if (asset.type !== 'prefab') {
			urlParamsLogger.warn('[prefab-auto-open] prefabId is not a prefab', { prefabId: prefabIdParam, type: asset.type })
			return
		}

		state.canvas.lastOpenedPrefabAssetId = asset.id
		return
	}

	const prefabPath = prefabPathParam ?? ''
	if (!projectDir) {
		urlParamsLogger.warn('[prefab-auto-open] prefabPath requires a loaded project dir', { prefabPath })
		return
	}

	const asset = findAssetByPath(state.assets.items, prefabPath, projectDir)
	if (!asset) {
		urlParamsLogger.warn('[prefab-auto-open] prefabPath not found in assets', { prefabPath })
		return
	}

	if (asset.type !== 'prefab') {
		urlParamsLogger.warn('[prefab-auto-open] prefabPath is not a prefab', { prefabPath, type: asset.type })
		return
	}

	state.canvas.lastOpenedPrefabAssetId = asset.id
}
