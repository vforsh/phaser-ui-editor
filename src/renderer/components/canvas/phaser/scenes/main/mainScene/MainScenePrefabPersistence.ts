import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { state } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import { err, ok, Result } from 'neverthrow'

import { getNameWithoutExtension } from '../../../../../../types/assets'
import { PrefabFile } from '../../../../../../types/prefabs/PrefabFile'
import { EditableContainer } from '../objects/EditableContainer'
import { MainSceneDeps } from './mainSceneTypes'

export class MainScenePrefabPersistence {
	constructor(private deps: MainSceneDeps) {}

	public async initRoot(prefabFile: PrefabFile) {
		let root: EditableContainer

		if (prefabFile.content) {
			await this.deps.assetLoader.loadPrefabAssets(prefabFile.content)
			root = this.deps.objectsFactory.fromJson(prefabFile.content, true) as EditableContainer
		} else {
			const name = getNameWithoutExtension(this.deps.sceneInitData.prefabAsset)
			root = this.deps.objectsFactory.container(name)
		}

		this.deps.setRoot(root)
		this.deps.getSuperRoot().add(root)
		this.deps.editContexts.switchTo(root)
	}

	public async savePrefab(): Promise<Result<void, string>> {
		if (!state.canvas.hasUnsavedChanges) {
			this.deps.logger.info(`no changes in '${this.deps.sceneInitData.prefabAsset.name}', skipping save`)
			return ok(undefined)
		}

		const prefabFilePath = this.deps.sceneInitData.prefabAsset.path
		const prefabContent = this.deps.rootToJson()

		const prefabFile: PrefabFile = {
			content: prefabContent,
			assetPack: this.calculatePrefabAssetPack(),
		}

		const { error } = await until(() => mainApi.writeJson({ path: prefabFilePath, content: prefabFile, options: { spaces: '\t' } }))
		if (error) {
			const errorLog = getErrorLog(error)
			this.deps.logger.error(`failed to save '${this.deps.sceneInitData.prefabAsset.name}' prefab (${errorLog})`)
			return err(errorLog)
		}

		this.deps.logger.info(`saved '${this.deps.sceneInitData.prefabAsset.name}' at ${prefabFilePath}`)

		this.deps.history.setBaseline(prefabContent)
		state.canvas.hasUnsavedChanges = false

		return ok(undefined)
	}

	private calculatePrefabAssetPack(): PrefabFile['assetPack'] {
		// TODO prefabs: convert the assets to Phaser AssetPack
		return []
	}
}
