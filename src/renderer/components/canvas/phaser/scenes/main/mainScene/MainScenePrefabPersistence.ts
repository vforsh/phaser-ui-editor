import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { state } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import { err, ok, Result } from 'neverthrow'

import {
	AssetTreeBitmapFontData,
	AssetTreeImageData,
	AssetTreeSpritesheetData,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
	getAssetById,
	getAssetRelativePath,
	getNameWithoutExtension,
	isAssetOfType,
} from '../../../../../../types/assets'
import { PrefabFile } from '../../../../../../types/prefabs/PrefabFile'
import { EditableContainer, EditableContainerJson } from '../objects/EditableContainer'
import { EditableObjectJson } from '../objects/EditableObject'
import { ensureLocalIds } from '../objects/localId'
import { MainSceneDeps } from './mainSceneTypes'

export class MainScenePrefabPersistence {
	constructor(private deps: MainSceneDeps) {}

	public async initRoot(prefabFile: PrefabFile) {
		let root: EditableContainer

		if (prefabFile.content) {
			ensureLocalIds(prefabFile.content)
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
			assetPack: this.calculatePrefabAssetPack(prefabContent),
		}

		const { error } = await until(() => mainApi.writeJson({ path: prefabFilePath, content: prefabFile, options: { spaces: '\t' } }))
		if (error) {
			const errorLog = getErrorLog(error)
			this.deps.logger.error(`failed to save '${this.deps.sceneInitData.prefabAsset.name}' prefab (${errorLog})`)
			return err(errorLog)
		}

		this.deps.logger.info(`saved '${this.deps.sceneInitData.prefabAsset.name}' at ${prefabFilePath}`)

		this.deps.history.setBaseline() // sync baseline revision after successful save

		return ok(undefined)
	}

	private calculatePrefabAssetPack(prefabContent: EditableContainerJson): PrefabFile['assetPack'] {
		const files: Phaser.Types.Loader.FileConfig[] = []
		const dedupe = new Set<string>()

		const addFile = (file: Phaser.Types.Loader.FileConfig, dedupeKey: string) => {
			if (dedupe.has(dedupeKey)) {
				return
			}

			dedupe.add(dedupeKey)
			files.push(file)
		}

		const warn = (message: string) => {
			this.deps.logger.warn(`[prefab-asset-pack] ${message}`)
		}

		const getSpritesheetAsset = (frameAsset: AssetTreeSpritesheetFrameData): AssetTreeSpritesheetData | null => {
			const parentId = frameAsset.parentId
			if (!parentId) {
				warn(`spritesheet frame '${frameAsset.name}' (${frameAsset.id}) has no parent spritesheet id`)
				return null
			}

			const parentAsset = getAssetById(state.assets.items, parentId)
			if (!parentAsset) {
				warn(`missing spritesheet parent for frame '${frameAsset.name}' (${frameAsset.id})`)
				return null
			}

			if (!isAssetOfType(parentAsset, 'spritesheet')) {
				warn(`spritesheet frame '${frameAsset.name}' (${frameAsset.id}) parent is not a spritesheet`)
				return null
			}

			return parentAsset
		}

		const addImage = (textureKey: string, imageAsset: AssetTreeImageData) => {
			const url = getAssetRelativePath(imageAsset.path)
			addFile(
				{
					type: 'image',
					key: textureKey,
					url,
				},
				`image:${textureKey}:${url}`,
			)
		}

		const addAtlas = (textureKey: string, spritesheetAsset: AssetTreeSpritesheetData) => {
			const textureURL = getAssetRelativePath(spritesheetAsset.image.path)
			const atlasURL = getAssetRelativePath(spritesheetAsset.json.path)
			addFile(
				{
					type: 'atlas',
					key: textureKey,
					textureURL,
					atlasURL,
				},
				`atlas:${textureKey}:${textureURL}:${atlasURL}`,
			)
		}

		const addBitmapFont = (fontKey: string, bitmapFont: AssetTreeBitmapFontData) => {
			if (bitmapFont.imageExtra) {
				warn(`bitmap font '${bitmapFont.name}' (${bitmapFont.id}) uses atlas textures (unsupported in assetPack)`)
				return
			}

			const textureURL = getAssetRelativePath(bitmapFont.image.path)
			const fontDataURL = getAssetRelativePath(bitmapFont.data.path)
			addFile(
				{
					type: 'bitmapFont',
					key: fontKey,
					textureURL,
					fontDataURL,
				},
				`bitmapFont:${fontKey}:${textureURL}:${fontDataURL}`,
			)
		}

		const addWebFont = (fontFamily: string, webFont: AssetTreeWebFontData) => {
			const url = getAssetRelativePath(webFont.path)
			addFile(
				{
					type: 'web-font',
					key: fontFamily,
					url,
					config: { fontFamily },
				} as Phaser.Types.Loader.FileConfig,
				`web-font:${fontFamily}:${url}`,
			)
		}

		const traverse = (object: EditableObjectJson) => {
			if (object.type === 'Container') {
				object.children.forEach(traverse)
				return
			}

			if (object.type === 'Image' || object.type === 'NineSlice') {
				const textureKey = object.textureKey
				if (!textureKey) {
					warn(`missing textureKey for ${object.type} '${object.name}' (${object.id})`)
					return
				}

				const asset = getAssetById(state.assets.items, object.asset.id)
				if (!asset) {
					warn(`missing asset for ${object.type} '${object.name}' (${object.id})`)
					return
				}

				if (isAssetOfType(asset, 'image')) {
					addImage(textureKey, asset)
					return
				}

				if (isAssetOfType(asset, 'spritesheet-frame')) {
					const spritesheetAsset = getSpritesheetAsset(asset)
					if (!spritesheetAsset) {
						return
					}

					addAtlas(textureKey, spritesheetAsset)
					return
				}

				warn(`unsupported ${object.type} asset type '${asset.type}' for '${object.name}' (${object.id})`)
				return
			}

			if (object.type === 'BitmapText') {
				const fontKey = object.font
				if (!fontKey) {
					warn(`missing font key for BitmapText '${object.name}' (${object.id})`)
					return
				}

				const asset = getAssetById(state.assets.items, object.asset.id)
				if (!asset || !isAssetOfType(asset, 'bitmap-font')) {
					warn(`missing bitmap font asset for '${object.name}' (${object.id})`)
					return
				}

				addBitmapFont(fontKey, asset)
				return
			}

			if (object.type === 'Text') {
				const fontFamily = object.style?.fontFamily
				if (!fontFamily) {
					warn(`missing fontFamily for Text '${object.name}' (${object.id})`)
					return
				}

				const asset = getAssetById(state.assets.items, object.asset.id)
				if (!asset || !isAssetOfType(asset, 'web-font')) {
					warn(`missing web font asset for '${object.name}' (${object.id})`)
					return
				}

				addWebFont(fontFamily, asset)
			}
		}

		traverse(prefabContent)

		files.sort((a, b) => getFileSortKey(a).localeCompare(getFileSortKey(b)))

		return [{ files }]
	}
}

function getFileSortKey(file: Phaser.Types.Loader.FileConfig): string {
	const data = file as Phaser.Types.Loader.FileConfig & {
		url?: string
		textureURL?: string
		atlasURL?: string
		fontDataURL?: string
	}

	return [data.type ?? '', data.key ?? '', data.url ?? '', data.textureURL ?? '', data.atlasURL ?? '', data.fontDataURL ?? ''].join('|')
}
