import { mainApi } from '@main-api/main-api'
import { state } from '@state/State'
import { err, ok, Result } from 'neverthrow'
import { match } from 'ts-pattern'
import WebFont from 'webfontloader'

import { WebFontParsed } from '../../../../../../../shared/main-api/MainApi'
import {
	AssetTreeBitmapFontData,
	AssetTreeItemDataOfType,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
	fetchImageUrl,
	getAssetById,
	getAssetRelativePath,
	GraphicAssetData,
	isAssetOfType,
} from '../../../../../../types/assets'
import { PrefabAsset } from '../../../../../../types/prefabs/PrefabAsset'
import { CanvasDocumentNodeJson, isPrefabInstanceJson } from '../../../../../../types/prefabs/PrefabDocument'
import { BmFontData } from '../../../robowhale/phaser3/gameObjects/bitmap-text/create-bmfont-data'
import { parseJsonBitmapFont } from '../../../robowhale/phaser3/gameObjects/bitmap-text/parse-json-bitmap-font'
import { EditableContainerJson } from '../objects/EditableContainer'
import { EditableObjectJson } from '../objects/EditableObject'
import { MainSceneDeps } from './mainSceneTypes'

type PhaserBmfontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData

export class MainSceneAssetLoader {
	constructor(private deps: MainSceneDeps) {}

	public async loadPrefabAssets(content: EditableContainerJson) {
		const prefabAssets = this.calculatePrefabAssets(content)

		for (const assetDef of prefabAssets) {
			const asset = getAssetById(state.assets.items, assetDef.id) as AssetTreeItemDataOfType<typeof assetDef.type>
			if (!asset) {
				this.deps.logger.warn(`failed to find ${assetDef.type} '${assetDef.name}' with id '${assetDef.id}'`)
				continue
			}

			await match(asset)
				.with({ type: 'image' }, async (image) => this.loadTexture(image))
				.with({ type: 'spritesheet-frame' }, async (frame) => this.loadSpritesheetFrame(frame))
				.with({ type: 'bitmap-font' }, async (bitmapFont) => this.loadBitmapFont(bitmapFont))
				.with({ type: 'web-font' }, async (webFont) => this.loadWebFont(webFont))
				.exhaustive()
		}
	}

	public calculatePrefabAssets(prefabRoot: CanvasDocumentNodeJson): PrefabAsset[] {
		const assetIds = new Set<string>()
		const assets: PrefabAsset[] = []

		const traverse = (object: CanvasDocumentNodeJson) => {
			if (isPrefabInstanceJson(object)) {
				return
			}

			if (object.type === 'Container') {
				for (const child of object.children) {
					traverse(child)
				}

				return
			}

			const objectAssets = match(object as EditableObjectJson)
				.returnType<PrefabAsset[]>()
				.with({ type: 'Container' }, () => [])
				.with({ type: 'Image' }, (image) => [image.asset])
				.with({ type: 'Text' }, (text) => [text.asset])
				.with({ type: 'BitmapText' }, (bitmapText) => [bitmapText.asset])
				.with({ type: 'NineSlice' }, (nineSlice) => [nineSlice.asset])
				.with({ type: 'Graphics' }, () => [])
				.exhaustive()

			for (const asset of objectAssets) {
				if (assetIds.has(asset.id)) {
					continue
				}

				assetIds.add(asset.id)
				assets.push(asset)
			}
		}

		traverse(prefabRoot)

		return assets
	}

	public async loadTexture(asset: GraphicAssetData): Promise<Phaser.Textures.Texture | null> {
		const textureKey = getAssetRelativePath(asset.path)
		const textures = this.deps.scene.textures

		if (textures.exists(textureKey)) {
			return textures.get(textureKey)
		}

		const img = await this.createImgForTexture(asset)
		if (!img) {
			return null
		}

		textures.addImage(textureKey, img)

		return textures.get(textureKey)
	}

	public async loadSpritesheetFrame(asset: AssetTreeSpritesheetFrameData): Promise<Phaser.Textures.Texture | null> {
		const spritesheetId = asset.parentId!
		const spritesheetAsset = getAssetById(state.assets.items, spritesheetId)
		if (!spritesheetAsset) {
			return null
		}

		if (!isAssetOfType(spritesheetAsset, 'spritesheet')) {
			return null
		}

		const textureKey = getAssetRelativePath(spritesheetAsset.image.path)
		const textures = this.deps.scene.textures

		if (textures.exists(textureKey)) {
			return textures.get(textureKey)
		}

		const img = await this.createImgForTexture(spritesheetAsset)
		if (!img) {
			return null
		}

		const json = await mainApi.readJson({ path: spritesheetAsset.json.path })
		if (!json) {
			return null
		}

		textures.addAtlas(textureKey, img, json)

		return textures.get(textureKey)
	}

	public async createImgForTexture(asset: GraphicAssetData): Promise<HTMLImageElement | null> {
		const imgUrl = await fetchImageUrl(asset)
		if (!imgUrl) {
			return null
		}

		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = () => reject(new Error(`Failed to load image: ${asset.path}`))
			img.src = imgUrl
		})
	}

	public async loadWebFont(asset: AssetTreeWebFontData): Promise<WebFontParsed> {
		const webFontParsed = await mainApi.parseWebFont({ path: asset.path })
		const webFontCss = this.createWebFontCss(webFontParsed)
		document.head.appendChild(webFontCss)

		return new Promise<WebFontParsed>((resolve, reject) => {
			WebFont.load({
				custom: {
					families: [webFontParsed.familyName],
				},
				active: () => {
					this.deps.logger.info(`web font loaded '${webFontParsed.familyName}'`)
					resolve(webFontParsed)
				},
				inactive: () => {
					this.deps.logger.warn(`web font not loaded '${webFontParsed.familyName}'`)
					reject(new Error(`failed to load web font '${webFontParsed.familyName}'`))
				},
			})
		})
	}

	private createWebFontCss(webFontParsed: WebFontParsed) {
		const dataUrl = `data:font/${webFontParsed.type.toLowerCase()};base64,${webFontParsed.base64}`
		const content = `@font-face {
			font-family: '${webFontParsed.familyName}';
			src: url('${dataUrl}') format('${webFontParsed.type.toLowerCase()}');
			font-weight: normal;
			font-style: normal;
		}`

		const css = document.createElement('style')
		css.textContent = content
		return css
	}

	public async loadBitmapFont(asset: AssetTreeBitmapFontData): Promise<Result<{ key: string; data: PhaserBmfontData }, string>> {
		const fontKey = asset.name
		const cache = this.deps.scene.sys.cache

		let bmFont = cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData } | undefined
		if (bmFont) {
			return ok({ key: fontKey, ...bmFont })
		}

		const frameData = await this.getBitmapFontFrame(asset)
		if (frameData.isErr()) {
			return frameData
		}

		const data = await this.getBitmapFontData(asset, frameData.value.frame)
		if (data.isErr()) {
			return data
		}

		if (frameData.value.fromAtlas) {
			cache.bitmapFont.add(fontKey, {
				data: data.value,
				texture: frameData.value.frame.texture.key,
				frame: frameData.value.frameKey,
				fromAtlas: true,
			})
		} else {
			cache.bitmapFont.add(fontKey, { data: data.value, texture: frameData.value.frame.texture.key })
		}

		bmFont = cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData }

		return ok({ key: fontKey, ...bmFont })
	}

	private async getBitmapFontFrame(asset: AssetTreeBitmapFontData) {
		const isFontFromAtlas = asset.imageExtra !== undefined
		if (isFontFromAtlas === false) {
			const texture = await this.loadTexture(asset.image)
			if (!texture) {
				return err('failed to load bitmap font texture')
			}

			return ok({
				// @ts-expect-error accessing Phaser texture internal frame map
				frame: texture.frames['__BASE'] as Phaser.Textures.Frame,
				fromAtlas: false as const,
			})
		}

		return ok({
			// @ts-expect-error placeholder atlas frame until implemented
			frame: null as Phaser.Textures.Frame,
			frameKey: '',
			fromAtlas: true as const,
		})
	}

	private async getBitmapFontData(asset: AssetTreeBitmapFontData, frame: Phaser.Textures.Frame) {
		let data: PhaserBmfontData

		if (asset.data.type === 'json') {
			const dataJson = (await mainApi.readJson({ path: asset.data.path })) as BmFontData
			if (!dataJson) {
				return err('failed to load bitmap font json data')
			}

			data = parseJsonBitmapFont(dataJson, frame)
		} else {
			const dataXmlRaw = await mainApi.readText({ path: asset.data.path })
			if (!dataXmlRaw) {
				return err('failed to load bitmap font xml data')
			}

			const dataXml = new DOMParser().parseFromString(dataXmlRaw.content, 'text/xml')
			if (!dataXml) {
				return err('failed to load bitmap font xml data')
			}

			data = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont(dataXml, frame)
		}

		return ok(data)
	}

	public getBitmapFontChars(data: PhaserBmfontData): string {
		return Object.keys(data.chars)
			.map((charCodeStr) => parseInt(charCodeStr))
			.map((charCode) => String.fromCharCode(charCode))
			.join('')
	}
}
