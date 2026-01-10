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
	getAssetsOfType,
	getNameWithoutExtension,
	isAssetOfType,
} from '../../../../../../types/assets'
import {
	CanvasDocumentJson,
	CanvasDocumentNodeJson,
	PrefabObjectPatch,
	isPrefabInstanceJson,
} from '../../../../../../types/prefabs/PrefabDocument'
import { PrefabFile } from '../../../../../../types/prefabs/PrefabFile'
import { EditableContainer, EditableContainerJson } from '../objects/EditableContainer'
import { EditableObjectJson } from '../objects/EditableObject'
import { MainScenePrefabThumbnailer } from './MainScenePrefabThumbnailer'
import { MainSceneDeps } from './mainSceneTypes'

export class MainScenePrefabPersistence {
	private readonly thumbnailer: MainScenePrefabThumbnailer

	constructor(private deps: MainSceneDeps) {
		this.thumbnailer = new MainScenePrefabThumbnailer(deps)
	}

	public async initRoot(prefabFile: PrefabFile) {
		let root: EditableContainer

		if (prefabFile.content) {
			const stats = getPrefabDocumentStats(prefabFile.content)
			this.deps.logger.info(
				`[prefab-open] prefab='${this.deps.sceneInitData.prefabAsset.name}' id=${this.deps.sceneInitData.prefabAsset.id} instances=${stats.prefabInstances} overrides(objects=${stats.overrideObjects} components=${stats.overrideComponents})`,
			)
			root = await this.deps.prefabDocument.expandDocumentToRuntime(prefabFile.content, true)
		} else {
			const name = getNameWithoutExtension(this.deps.sceneInitData.prefabAsset)
			this.deps.logger.info(
				`[prefab-open] prefab='${this.deps.sceneInitData.prefabAsset.name}' id=${this.deps.sceneInitData.prefabAsset.id} empty-content=true`,
			)
			root = this.deps.objectsFactory.container(name)
		}

		this.deps.setRoot(root)
		this.deps.getSuperRoot().add(root)
		this.deps.editContexts.switchTo(root)
	}

	public async savePrefab(): Promise<Result<void, string>> {
		if (!state.canvas.hasUnsavedChanges) {
			this.deps.logger.debug(`no changes in '${this.deps.sceneInitData.prefabAsset.name}', skipping save`)
			return ok(undefined)
		}

		const prefabFilePath = this.deps.sceneInitData.prefabAsset.path
		const prefabContent = this.deps.rootToJson()
		const stats = getPrefabDocumentStats(prefabContent)

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

		const assetFiles = prefabFile.assetPack[0]?.files.length ?? 0
		this.deps.logger.info(
			`[prefab-save] prefab='${this.deps.sceneInitData.prefabAsset.name}' id=${this.deps.sceneInitData.prefabAsset.id} instances=${stats.prefabInstances} overrides(objects=${stats.overrideObjects} components=${stats.overrideComponents}) assetFiles=${assetFiles} path=${prefabFilePath}`,
		)
		this.deps.prefabDocument.invalidatePrefab(this.deps.sceneInitData.prefabAsset.id)

		this.deps.history.setBaseline() // sync baseline revision after successful save

		// Fire-and-forget thumbnail capture after successful save (non-blocking)
		void this.thumbnailer.captureAndWriteCurrentPrefabThumbnail()

		return ok(undefined)
	}

	public getPrefabDocument(): { expanded: EditableContainerJson; collapsed: CanvasDocumentJson } {
		return {
			expanded: this.deps.getRoot().toJson(),
			collapsed: this.deps.rootToJson(),
		}
	}

	private calculatePrefabAssetPack(prefabContent: CanvasDocumentJson): PrefabFile['assetPack'] {
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

		const images = getAssetsOfType(state.assets.items, 'image')
		const imageByTextureKey = new Map<string, AssetTreeImageData>()
		for (const image of images) {
			imageByTextureKey.set(getAssetRelativePath(image.path), image)
		}

		const spritesheets = getAssetsOfType(state.assets.items, 'spritesheet')
		const spritesheetByTextureKey = new Map<string, AssetTreeSpritesheetData>()
		for (const spritesheet of spritesheets) {
			spritesheetByTextureKey.set(getAssetRelativePath(spritesheet.image.path), spritesheet)
		}

		const bitmapFonts = getAssetsOfType(state.assets.items, 'bitmap-font')
		const bitmapFontByName = new Map<string, AssetTreeBitmapFontData>()
		for (const bitmapFont of bitmapFonts) {
			bitmapFontByName.set(bitmapFont.name, bitmapFont)
		}

		const webFonts = getAssetsOfType(state.assets.items, 'web-font')
		const webFontByFamily = new Map<string, AssetTreeWebFontData>()
		for (const webFont of webFonts) {
			webFontByFamily.set(webFont.fontFamily, webFont)
		}

		const addOverrideAssets = (patch: PrefabObjectPatch) => {
			const textureKey = typeof patch.textureKey === 'string' ? patch.textureKey : null
			if (textureKey) {
				const spritesheet = spritesheetByTextureKey.get(textureKey)
				const image = imageByTextureKey.get(textureKey)
				if (patch.frameKey !== undefined && patch.frameKey !== null) {
					if (spritesheet) {
						addAtlas(textureKey, spritesheet)
					} else {
						warn(`missing spritesheet for override textureKey '${textureKey}' (frameKey '${patch.frameKey}')`)
					}
				} else if (image) {
					addImage(textureKey, image)
				} else if (spritesheet) {
					addAtlas(textureKey, spritesheet)
				} else {
					warn(`missing asset for override textureKey '${textureKey}'`)
				}
			} else if (patch.frameKey !== undefined && patch.frameKey !== null) {
				warn(`missing textureKey for override frameKey '${patch.frameKey}'`)
			}

			const bitmapFontKey = typeof patch.font === 'string' ? patch.font : null
			if (bitmapFontKey) {
				const bitmapFont = bitmapFontByName.get(bitmapFontKey)
				if (bitmapFont) {
					addBitmapFont(bitmapFontKey, bitmapFont)
				} else {
					warn(`missing bitmap font for override font '${bitmapFontKey}'`)
				}
			}

			const fontFamily = typeof patch.style?.fontFamily === 'string' ? patch.style.fontFamily : null
			if (fontFamily) {
				const webFont = webFontByFamily.get(fontFamily)
				if (webFont) {
					addWebFont(fontFamily, webFont)
				} else {
					warn(`missing web font for override fontFamily '${fontFamily}'`)
				}
			}
		}

		const traverseOverrides = (object: CanvasDocumentNodeJson) => {
			if (isPrefabInstanceJson(object)) {
				const overrides = object.overrides?.objects ?? []
				for (const entry of overrides) {
					addOverrideAssets(entry.patch)
				}
				return
			}

			if (object.type === 'Container') {
				object.children.forEach(traverseOverrides)
			}
		}

		const traverse = (object: EditableObjectJson | CanvasDocumentJson['children'][number]) => {
			if (isPrefabInstanceJson(object)) {
				return
			}

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
		traverseOverrides(prefabContent)

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

function getPrefabDocumentStats(root: CanvasDocumentNodeJson) {
	const stats = { prefabInstances: 0, overrideObjects: 0, overrideComponents: 0 }

	const visit = (node: CanvasDocumentNodeJson) => {
		if (isPrefabInstanceJson(node)) {
			stats.prefabInstances += 1
			stats.overrideObjects += node.overrides?.objects?.length ?? 0
			stats.overrideComponents += node.overrides?.components?.length ?? 0
			return
		}

		if (node.type === 'Container') {
			node.children.forEach(visit)
		}
	}

	visit(root)

	return stats
}
