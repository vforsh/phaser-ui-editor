import type { ILogObj, Logger } from 'tslog'

import { IPatchesConfig } from '@koreez/phaser3-ninepatch'
import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { getErrorLog } from '@utils/error/utils'
import { match } from 'ts-pattern'

import type {
	AssetTreeBitmapFontData,
	AssetTreeItemData,
	AssetTreeImageData,
	AssetTreePrefabData,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
} from '../../../../../../types/assets'
import type { EditContext } from '../editContext/EditContext'
import type { EditableObject } from '../objects/EditableObject'
import type { EditableObjectsFactory } from '../objects/EditableObjectsFactory'
import type { MainSceneAssetLoader } from './MainSceneAssetLoader'

import {
	createPrefabAsset,
	PrefabBitmapFontAsset,
	PrefabImageAsset,
	PrefabSpritesheetFrameAsset,
	PrefabWebFontAsset,
} from '../../../../../../types/prefabs/PrefabAsset'
import { PrefabFile } from '../../../../../../types/prefabs/PrefabFile'
import { EditableContainer } from '../objects/EditableContainer'
import { ensureLocalIds } from '../objects/localId'

export type MainSceneFactoryOptions = {
	textures: Phaser.Textures.TextureManager
	logger: Logger<ILogObj>
	assetLoader: MainSceneAssetLoader
	objectsFactory: EditableObjectsFactory
	getNewObjectName: (context: EditContext, objToName: EditableObject, prefix?: string) => string
}

/**
 * Creates `EditableObject`s from asset tree items (drag/drop, insert-from-assets, etc).
 *
 * Responsibilities:
 * - Load any required runtime resources (textures, fonts, prefab assets) via `assetLoader`
 * - Instantiate the correct editable object via `objectsFactory`
 * - Assign a unique name for the given `EditContext` via `getNewObjectName`
 *
 * Non-goals:
 * - Adding the created object to a container / scene graph
 * - Selection, undo/redo history, or positioning (handled by higher-level ops)
 */
export class MainSceneFactory {
	constructor(private options: MainSceneFactoryOptions) {}

	public async createObjectFromAsset(asset: AssetTreeItemData, context: EditContext): Promise<EditableObject | null> {
		const textures = this.options.textures

		return match(asset)
			.with({ type: 'image' }, async (image) => this.createFromImage(image, context, textures))
			.with({ type: 'spritesheet-frame' }, async (frame) => this.createFromSpritesheetFrame(frame, context, textures))
			.with({ type: 'web-font' }, async (webFont) => this.createFromWebFont(webFont, context))
			.with({ type: 'bitmap-font' }, async (bitmapFont) => this.createFromBitmapFont(bitmapFont, context))
			.with({ type: 'prefab' }, async (prefab) => this.createFromPrefab(prefab, context))
			.otherwise(() => null)
	}

	private async createFromImage(
		image: AssetTreeImageData,
		context: EditContext,
		textures: Phaser.Textures.TextureManager,
	): Promise<EditableObject | null> {
		let texture: Phaser.Textures.Texture | null = textures.get(image.id)
		if (!texture || texture.key === '__MISSING') {
			texture = await this.options.assetLoader.loadTexture(image)
		}

		if (!texture) {
			return null
		}

		const imageAsset = createPrefabAsset<PrefabImageAsset>(image)
		const img = this.options.objectsFactory.image(imageAsset, texture.key)
		img.setName(this.options.getNewObjectName(context, img))
		return img
	}

	private async createFromSpritesheetFrame(
		frame: AssetTreeSpritesheetFrameData,
		context: EditContext,
		textures: Phaser.Textures.TextureManager,
	): Promise<EditableObject | null> {
		let texture: Phaser.Textures.Texture | null = textures.get(frame.id)
		if (!texture || texture.key === '__MISSING') {
			texture = await this.options.assetLoader.loadSpritesheetFrame(frame)
		}

		if (!texture) {
			return null
		}

		if (frame.scale9Borders) {
			return this.createNineSliceFromSpritesheetFrame(frame, context, texture.key)
		}

		return this.createImageFromSpritesheetFrame(frame, context, texture.key)
	}

	private createNineSliceFromSpritesheetFrame(frame: AssetTreeSpritesheetFrameData, context: EditContext, textureKey: string) {
		const frameWidth = frame.size.w
		const frameHeight = frame.size.h
		const { x, y, w, h } = frame.scale9Borders!
		const nineScaleConfig: IPatchesConfig = {
			top: y,
			bottom: frameHeight - y - h,
			left: x,
			right: frameWidth - x - w,
		}

		const frameAsset = createPrefabAsset<PrefabSpritesheetFrameAsset>(frame)
		const ns = this.options.objectsFactory.nineSlice(
			frameAsset,
			frame.size.w,
			frame.size.h,
			textureKey,
			frame.pathInHierarchy,
			nineScaleConfig,
		)
		ns.setName(this.options.getNewObjectName(context, ns))
		return ns
	}

	private createImageFromSpritesheetFrame(frame: AssetTreeSpritesheetFrameData, context: EditContext, textureKey: string) {
		const frameAsset = createPrefabAsset<PrefabSpritesheetFrameAsset>(frame)
		const img = this.options.objectsFactory.image(frameAsset, textureKey, frame.pathInHierarchy)
		img.setName(this.options.getNewObjectName(context, img))
		return img
	}

	private async createFromWebFont(webFont: AssetTreeWebFontData, context: EditContext): Promise<EditableObject | null> {
		const font = await this.options.assetLoader.loadWebFont(webFont)
		if (!font) {
			return null
		}

		const textAsset = createPrefabAsset<PrefabWebFontAsset>(webFont)
		const text = this.options.objectsFactory.text(textAsset, font.familyName, {
			fontFamily: font.familyName,
			fontSize: '60px',
			color: '#ffffff',
		})
		text.setName(this.options.getNewObjectName(context, text, 'text'))
		return text
	}

	private async createFromBitmapFont(bitmapFont: AssetTreeBitmapFontData, context: EditContext): Promise<EditableObject | null> {
		const bmFontResult = await this.options.assetLoader.loadBitmapFont(bitmapFont)
		if (!bmFontResult || bmFontResult.isErr()) {
			return null
		}

		const bmTextAsset = createPrefabAsset<PrefabBitmapFontAsset>(bitmapFont)
		const bmFont = bmFontResult.value
		const bmTextContent = this.options.assetLoader.getBitmapFontChars(bmFont.data).replace(' ', '').slice(0, 10)
		const bmText = this.options.objectsFactory.bitmapText(bmTextAsset, bmFont.key, bmTextContent, bmFont.data.size)
		bmText.setName(this.options.getNewObjectName(context, bmText, 'bitmap-text'))
		return bmText
	}

	private async createFromPrefab(prefab: AssetTreePrefabData, context: EditContext): Promise<EditableObject | null> {
		const { error, data } = await until(() => mainApi.readJson({ path: prefab.path }))
		if (error) {
			this.options.logger.error(`failed to load prefab file '${prefab.path}' (${getErrorLog(error)})`)
			return null
		}

		const prefabFile = data as PrefabFile
		if (!prefabFile.content) {
			this.options.logger.error(`${prefab.name} (${prefab.id}) is empty`)
			return null
		}

		await this.options.assetLoader.loadPrefabAssets(prefabFile.content)

		const containerJson = { ...prefabFile.content, prefab: { id: prefab.id, name: prefab.name } }
		ensureLocalIds(containerJson)
		const container = this.options.objectsFactory.fromJson(containerJson) as EditableContainer
		container.setName(this.options.getNewObjectName(context, container))

		return container
	}
}
