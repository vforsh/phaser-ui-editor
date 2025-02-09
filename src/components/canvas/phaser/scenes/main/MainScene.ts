import { IPatchesConfig } from '@koreez/phaser3-ninepatch'
import { state } from '@state/State'
import { urlParams } from '@url-params'
import { once } from 'es-toolkit'
import { err, ok, Result } from 'neverthrow'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import WebFont from 'webfontloader'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { logger } from '../../../../../logs/logs'
import { Project } from '../../../../../project/Project'
import { ProjectConfig } from '../../../../../project/ProjectConfig'
import trpc, { WebFontParsed } from '../../../../../trpc'
import {
	AssetTreeBitmapFontData,
	AssetTreeItemData,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
	fetchImageUrl,
	getAssetById,
	getAssetRelativePath,
	getAssetsOfType,
	GraphicAssetData,
	isAssetOfType,
} from '../../../../../types/assets'
import { parseJsonBitmapFont } from '../../robowhale/phaser3/gameObjects/bitmap-text/parse-json-bitmap-font'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { signalFromEvent } from '../../robowhale/utils/events/create-abort-signal-from-event'
import { Aligner } from './Aligner'
import { CanvasClipboard } from './CanvasClipboard'
import { EditContext } from './editContext/EditContext'
import { EditContextsManager } from './editContext/EditContextsManager'
import { Selection } from './editContext/Selection'
import { TransformControls } from './editContext/TransformControls'
import { Grid } from './Grid'
import {
	AddComponentResult,
	MoveComponentResult,
	RemoveComponentResult,
} from './objects/components/base/ComponentsManager'
import { EditableComponentType } from './objects/components/base/EditableComponent'
import { EditableComponentsFactory } from './objects/components/base/EditableComponentsFactory'
import { EditableContainer } from './objects/EditableContainer'
import { EditableImage } from './objects/EditableImage'
import { EditableObject } from './objects/EditableObject'
import { EditableObjectsFactory } from './objects/EditableObjectsFactory'
import { Rulers } from './Rulers'
type PhaserBmfontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData

export type MainSceneInitData = {
	project: Project
}

type SelectionDragData = {
	target: Selection
	// initial position of the selection
	currentX: number
	currentY: number
	// initial offset of the selection relative to the pointer
	offsetX: number
	offsetY: number
	// axis to lock the selection movement on
	lockAxis: 'x' | 'y' | 'none'
}

export class MainScene extends BaseScene {
	public declare initData: MainSceneInitData
	private logger!: Logger<{}>
	private sceneClickedAt: number | undefined
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private grid!: Grid
	private rulers!: Rulers
	private editContexts!: EditContextsManager
	private root!: EditableContainer
	// TODO move to a separate class, it should emit events on resize
	public projectSizeFrame!: Phaser.GameObjects.Graphics & { width: number; height: number }
	public objectsFactory!: EditableObjectsFactory
	private componentsFactory!: EditableComponentsFactory
	private clipboard!: CanvasClipboard
	private aligner!: Aligner

	public init(data: MainSceneInitData) {
		super.init(data)

		const clearConsole = urlParams.get('clearConsole') === 'scene'
		if (clearConsole) {
			console.clear()
		}

		this.logger = logger.getOrCreate('canvas')

		this.logger.info('MainScene init', data)

		this.sceneClickedAt = 0
	}

	public create() {
		if (!this.initData) {
			throw new Error('MainScene.initData is not set')
		}

		this.grid = new Grid(this)
		this.grid.name = 'grid'
		this.add.existing(this.grid)

		this.rulers = new Rulers(this)
		this.rulers.name = 'rulers'
		this.add.existing(this.rulers)

		this.initComponentsFactory()

		this.initObjectsFactory()

		this.initClipboard()

		this.initEditContexts()

		this.initRoot()

		this.initAligner()

		this.addProjectSizeFrame(this.initData.project.config.size)

		this.addKeyboadCallbacks()

		this.addPointerCallbacks()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		const cameraState = state.canvas.camera
		const camera = this.cameras.main
		camera.setZoom(cameraState.zoom)
		camera.setScroll(cameraState.scrollX, cameraState.scrollY)

		this.onResizeOrCameraChange(this.scale.gameSize)

		const isDefaultCameraSettings = cameraState.zoom === 1 && cameraState.scrollX === 0 && cameraState.scrollY === 0
		if (isDefaultCameraSettings) {
			this.alignCameraToProjectFrame()
		}

		this.setupAppCommands()

		this.addTestObjects()

		state.canvas.objects = this.root.stateObj
		state.canvas.objectById = (id: string) => this.objectsFactory.getObjectById(id)?.stateObj
	}

	private initComponentsFactory() {
		this.componentsFactory = new EditableComponentsFactory({
			logger: this.logger.getSubLogger({ name: ':components-factory' }),
		})
	}

	private initObjectsFactory() {
		this.objectsFactory = new EditableObjectsFactory({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':objects-factory' }),
			componentsFactory: this.componentsFactory,
		})
	}

	private initClipboard() {
		this.clipboard = new CanvasClipboard(this, {
			logger: this.logger.getSubLogger({ name: ':clipboard' }),
			factory: this.objectsFactory,
		})
	}

	private initEditContexts() {
		this.editContexts = new EditContextsManager({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':contexts' }),
		})

		this.editContexts.on(
			'selection-changed',
			(selection) => {
				const selectionIds = selection?.objects.map((obj) => obj.id) || []
				state.canvas.selection = selectionIds
				state.canvas.selectionChangedAt = Date.now()
			},
			this,
			this.shutdownSignal
		)
	}

	private initRoot() {
		this.root = this.objectsFactory.container()
		this.root.name = 'root' // TODO use the current prefab name (from the assets tree)
		this.add.existing(this.root)

		this.editContexts.add(this.root, {
			switchTo: true,
			isRoot: true,
		})
	}

	private initAligner() {
		this.aligner = new Aligner({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':align' }),
		})

		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter
		appCommands.on(
			'align',
			(type) => {
				const context = this.editContexts.current!
				const selection = context.selection
				if (!selection) {
					return
				}

				this.aligner.logger.debug(`aligning ${selection.objectsAsString} to ${type}`)

				const wasAligned = this.aligner.align(type, selection.objects, context)
				if (wasAligned) {
					selection.updateBounds()
				}
			},
			this,
			false,
			this.shutdownSignal
		)
	}

	private addProjectSizeFrame(size: ProjectConfig['size']) {
		this.projectSizeFrame = this.add.graphics() as Phaser.GameObjects.Graphics & { width: number; height: number }
		this.projectSizeFrame.lineStyle(1, 0xffffff, 1)
		this.projectSizeFrame.strokeRect(0, 0, size.width, size.height)
		// this.projectSizeFrame.fillStyle(0x2f0559, 0.25)
		// this.projectSizeFrame.fillRect(0, 0, size.width, size.height)
		this.projectSizeFrame.width = size.width
		this.projectSizeFrame.height = size.height
	}

	private async addTestObjects(): Promise<void> {
		const context = this.editContexts.current!

		const chefCherryFrame = getAssetsOfType(state.assets.items, 'spritesheet-frame').find(
			(frame) => frame.name === 'Chef Cherry'
		)

		let chefCherry_1: EditableImage | undefined
		if (chefCherryFrame) {
			chefCherry_1 = (await this.addTestImage(chefCherryFrame, -400, -600)) as EditableImage
			chefCherry_1?.setName(this.getNewObjectName(context, chefCherry_1!, 'chefCherry_topLeft'))
			chefCherry_1?.setOrigin(0)
		}

		let chefCherry_2: EditableImage | undefined
		if (chefCherryFrame) {
			chefCherry_2 = (await this.addTestImage(chefCherryFrame, 400, -600)) as EditableImage
			chefCherry_2?.setName(this.getNewObjectName(context, chefCherry_2!, 'chefCherry_topRight'))
			chefCherry_2?.setOrigin(1, 0)
		}

		if (chefCherry_1 && chefCherry_2) {
			const selection = context.setSelection([chefCherry_1, chefCherry_2])
			const group = this.group(selection, context)
			group.setPosition(group.x, group.y - 150)
		}

		if (chefCherryFrame) {
			const chefCherry_3 = (await this.addTestImage(chefCherryFrame, -250, -30)) as EditableImage
			chefCherry_3?.setName(this.getNewObjectName(context, chefCherry_3!, 'chefCherry_bottomLeft'))
			chefCherry_3?.setOrigin(0.5, 0.5)
			chefCherry_3?.setAngle(90)
			context.setSelection([chefCherry_3])
		}

		const nineSliceAsset = getAssetsOfType(state.assets.items, 'spritesheet-frame').find(
			(frame) => frame.name === 'popup_back.png'
		)
		if (nineSliceAsset) {
			const nineSlice = await this.handleAssetDrop({
				asset: nineSliceAsset,
				position: { x: -400, y: -400 },
			})
			if (nineSlice && nineSlice.kind === 'NineSlice') {
				nineSlice.resize(500, 400)
				nineSlice.setPosition(this.projectSizeFrame.width / 2 + 250, this.projectSizeFrame.height / 2 - 30)
			}
		}

		const bitmapFont = await this.initBitmapFont_DEBUG('5cbc7ed7df')
		if (bitmapFont.isOk()) {
			const bmFont = bitmapFont.value
			const bmText = this.objectsFactory.bitmapText(bmFont.key, '1234567890', 100)
			bmText.setName(this.getNewObjectName(context, bmText, 'bitmap-text'))
			bmText.setPosition(this.projectSizeFrame.width / 2, this.projectSizeFrame.height - 70)
			this.root.add(bmText)
		} else {
			this.logger.warn(`failed to load bitmap font (${bitmapFont.error})`)
		}

		const webFont = await this.initWebFont_DEBUG('e97f56cb27')
		if (webFont) {
			const text = this.objectsFactory.text(webFont.familyName + `\nYo Poetsen One Two Three Four`, {
				fontFamily: webFont.familyName,
				fontSize: '50px',
				color: '#ffffff',
				resolution: 2,
				align: 'center',
			})
			text.setName(this.getNewObjectName(context, text, 'text'))
			text.setPosition(this.projectSizeFrame.width / 2, this.projectSizeFrame.height + 100)
			text.setStroke('#ff0000', 6)
			text.setShadow(0, 10, 'rgba(0, 0, 0, 0.33)', 0, true, false)
			this.root.add(text)
		} else {
			this.logger.warn('failed to load web font')
		}
	}

	// TODO move to ObjectsFactory
	private getNewObjectName(context: EditContext, obj: EditableObject, prefix?: string): string {
		const _prefix = prefix ?? this.extractNamePrefix(obj.name) ?? this.createNamePrefix(obj)
		const uid = Phaser.Math.RND.uuid().slice(0, 4)

		return `${_prefix}__${uid}`
	}

	private createNamePrefix(obj: EditableObject): string {
		return match(obj)
			.with({ kind: 'Container' }, () => 'group')
			.with({ kind: 'Image' }, (image) => {
				const textureKey = image.texture.key
				const frameKey = image.frame.name
				return `${textureKey}_${frameKey}`
			})
			.otherwise(() => 'item')
	}

	private extractNamePrefix(name: string): string | undefined {
		if (!name || !name.includes('__')) {
			return undefined
		}

		return name.split('__')[0]
	}

	private async addTestImage(asset: GraphicAssetData, offsetX: number, offsetY: number, angle = 0) {
		const gameObject = await this.handleAssetDrop({
			asset,
			position: {
				x: this.initData.project.config.size.width / 2,
				y: this.initData.project.config.size.height / 2,
			},
		})

		if (gameObject) {
			const centerX = this.initData.project.config.size.width / 2
			const centerY = this.initData.project.config.size.height / 2
			gameObject.setPosition(centerX + offsetX, centerY + offsetY)
			gameObject.setAngle(angle)
		}

		return gameObject
	}

	private setupAppCommands() {
		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter

		appCommands.on('add-component', this.addComponent, this, false, this.shutdownSignal)
		appCommands.on('remove-component', this.removeComponent, this, false, this.shutdownSignal)
		appCommands.on('move-component-up', this.moveComponentUp, this, false, this.shutdownSignal)
		appCommands.on('move-component-down', this.moveComponentDown, this, false, this.shutdownSignal)

		appCommands.on('handle-asset-drop', this.handleAssetDrop, this, false, this.shutdownSignal)
	}

	private addComponent(data: { componentType: EditableComponentType; objectId: string }): AddComponentResult {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const component = this.componentsFactory.create(data.componentType)
		if (!component) {
			return err(`failed to create component '${data.componentType}'`)
		}

		return obj.components.add(component)
	}

	private removeComponent(data: { componentType: EditableComponentType; objectId: string }): RemoveComponentResult {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		return obj.components.remove(data.componentType)
	}

	private moveComponentUp(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		return obj.components.moveUp(data.componentType)
	}

	private moveComponentDown(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		const obj = this.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		return obj.components.moveDown(data.componentType)
	}

	/**
	 * Handles asset that was dropped from the Assets Panel on the canvas.
	 * @returns The created editable object or null if the object could not be created.
	 */
	private async handleAssetDrop(data: { asset: AssetTreeItemData; position: { x: number; y: number } }) {
		const obj = await this.createObjectFromAsset(data.asset)
		if (!obj) {
			return null
		}

		obj.setName(this.getNewObjectName(this.editContexts.current!, obj, data.asset.name))
		obj.setPosition(data.position.x, data.position.y)

		if ('setOrigin' in obj && typeof obj.setOrigin === 'function') {
			const origin =
				data.asset.type === 'spritesheet-frame' && data.asset.anchor ? data.asset.anchor : { x: 0.5, y: 0.5 }

			obj.setOrigin(origin.x, origin.y)
		}

		this.editContexts.current!.target.add(obj)

		return obj
	}

	private createObjectFromAsset(asset: AssetTreeItemData) {
		return match(asset)
			.with({ type: 'image' }, async (image) => {
				let texture: Phaser.Textures.Texture | null = this.textures.get(image.id)
				if (!texture || texture.key === '__MISSING') {
					texture = await this.loadTexture(image)
				}

				if (!texture) {
					return null
				}

				return this.objectsFactory.image(texture.key)
			})
			.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
				let texture: Phaser.Textures.Texture | null = this.textures.get(spritesheetFrame.id)
				if (!texture || texture.key === '__MISSING') {
					texture = await this.loadTextureAtlas(spritesheetFrame)
				}

				if (!texture) {
					return null
				}

				if (spritesheetFrame.scale9Borders) {
					const frameWidth = spritesheetFrame.size.w
					const frameHeight = spritesheetFrame.size.h
					const { x, y, w, h } = spritesheetFrame.scale9Borders
					const nineScaleConfig: IPatchesConfig = {
						top: y,
						bottom: frameHeight - y - h,
						left: x,
						right: frameWidth - x - w,
					}

					return this.objectsFactory.nineSlice(
						spritesheetFrame.size.w,
						spritesheetFrame.size.h,
						texture.key,
						spritesheetFrame.pathInHierarchy,
						nineScaleConfig
					)
				} else {
					return this.objectsFactory.image(texture.key, spritesheetFrame.pathInHierarchy)
				}
			})
			.with({ type: 'web-font' }, async (webFontAsset) => {
				const font = await this.loadWebFont(webFontAsset)
				if (!font) {
					return null
				}

				const text = this.objectsFactory.text(font.familyName, {
					fontFamily: font.familyName,
					fontSize: '60px',
					color: '#ffffff',
				})
				text.setName(this.getNewObjectName(this.editContexts.current!, text, 'text'))
				return text
			})
			.with({ type: 'bitmap-font' }, async (bitmapFontAsset) => {
				const bmFontResult = await this.loadBitmapFont(bitmapFontAsset)
				if (!bmFontResult || bmFontResult.isErr()) {
					return null
				}

				const bmFont = bmFontResult.value
				const bmTextContent = this.getBitmapFontChars(bmFont.data).replace(' ', '').slice(0, 10)
				const bmText = this.objectsFactory.bitmapText(bmFont.key, bmTextContent, bmFont.data.size)
				bmText.setName(this.getNewObjectName(this.editContexts.current!, bmText, 'bitmap-text'))
				return bmText
			})
			.otherwise(() => null)
	}

	private async loadTexture(asset: GraphicAssetData): Promise<Phaser.Textures.Texture | null> {
		const img = await this.createImgForTexture(asset)
		if (!img) {
			return null
		}

		const textureKey = getAssetRelativePath(asset.path)

		this.textures.addImage(textureKey, img)

		return this.textures.get(textureKey)
	}

	private async loadTextureAtlas(asset: AssetTreeSpritesheetFrameData): Promise<Phaser.Textures.Texture | null> {
		const spritesheetId = asset.parentId!
		const spritesheetAsset = getAssetById(state.assets.items, spritesheetId)
		if (!spritesheetAsset || spritesheetAsset.type !== 'spritesheet') {
			return null
		}

		const img = await this.createImgForTexture(spritesheetAsset)
		if (!img) {
			return null
		}

		const json = await trpc.readJson.query({ path: spritesheetAsset.json.path })
		if (!json) {
			return null
		}

		const textureKey = getAssetRelativePath(spritesheetAsset.image.path)

		this.textures.addAtlas(textureKey, img, json)

		return this.textures.get(textureKey)
	}

	/**
	 * Creates an `<img>` element that will be used as a Phaser texture source.
	 * TODO return Result
	 */
	private async createImgForTexture(asset: GraphicAssetData): Promise<HTMLImageElement | null> {
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

	private initWebFont_DEBUG(assetId: string): Promise<WebFontParsed | undefined> {
		const asset = getAssetById(state.assets.items, assetId)
		if (!asset) {
			this.logger.warn(`failed to find web font asset with id '${assetId}'`)
			return Promise.resolve(undefined)
		}

		if (!isAssetOfType(asset, 'web-font')) {
			this.logger.warn(`asset '${asset.name}' (${asset.id}) is not a web font asset (actual type: ${asset.type})`)
			return Promise.resolve(undefined)
		}

		return this.loadWebFont(asset)
	}

	private async loadWebFont(asset: AssetTreeWebFontData) {
		// it only supports WOFF, WOFF2 and TTF formats
		const webFontParsed = await trpc.parseWebFont.query({ path: asset.path })
		const webFontCss = this.createWebFontCss(webFontParsed)
		document.head.appendChild(webFontCss)

		return new Promise<WebFontParsed>((resolve, reject) => {
			WebFont.load({
				custom: {
					families: [webFontParsed.familyName],
				},
				active: () => {
					this.logger.info(`web font loaded '${webFontParsed.familyName}'`)
					resolve(webFontParsed)
				},
				inactive: () => {
					this.logger.warn(`web font not loaded '${webFontParsed.familyName}'`)
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

	private async initBitmapFont_DEBUG(assetId: string) {
		const asset = getAssetById(state.assets.items, assetId)
		if (!asset) {
			return err(`failed to find asset with id '${assetId}'`)
		}

		if (!isAssetOfType(asset, 'bitmap-font')) {
			return err(`asset '${asset.name}' (${asset.id}) is not a bitmap font asset (actual type: ${asset.type})`)
		}

		return this.loadBitmapFont(asset)
	}

	private async loadBitmapFont(
		asset: AssetTreeBitmapFontData
	): Promise<Result<{ key: string; data: PhaserBmfontData }, string>> {
		const fontKey = asset.name

		let bmFont = this.sys.cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData } | undefined
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
			// prettier-ignore
			this.sys.cache.bitmapFont.add(fontKey, { data: data.value, texture: frameData.value.frame.texture.key, frame: frameData.value.frameKey, fromAtlas: true })
		} else {
			this.sys.cache.bitmapFont.add(fontKey, { data: data.value, texture: frameData.value.frame.texture.key })
		}

		bmFont = this.sys.cache.bitmapFont.get(fontKey) as { data: PhaserBmfontData }

		return ok({ key: fontKey, ...bmFont })
	}

	private async getBitmapFontFrame(asset: AssetTreeBitmapFontData) {
		const isFontFromAtlas = asset.imageExtra !== undefined
		if (isFontFromAtlas === false) {
			// load texture
			const texture = await this.loadTexture(asset.image)
			if (!texture) {
				return err('failed to load bitmap font texture')
			}

			return ok({
				// @ts-expect-error
				frame: texture.frames['__BASE'] as Phaser.Textures.Frame,
				fromAtlas: false as const,
			})
		}

		// TODO implement loading bitmap font frame from atlas
		// const atlasJson = asset.imageExtra?.atlas
		// const atlasTexture = this.textures.get(atlasJson.texture.path)
		// const fontFrame = ...
		return ok({
			// @ts-expect-error
			frame: null as Phaser.Textures.Frame,
			frameKey: '',
			fromAtlas: true as const,
		})
	}

	private async getBitmapFontData(asset: AssetTreeBitmapFontData, frame: Phaser.Textures.Frame) {
		let data: PhaserBmfontData

		if (asset.data.type === 'json') {
			const dataJson = await trpc.readJson.query({ path: asset.data.path })
			if (!dataJson) {
				return err('failed to load bitmap font json data')
			}

			data = parseJsonBitmapFont(dataJson, frame)
		} else {
			const dataXmlRaw = await trpc.readText.query({ path: asset.data.path })
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

	private getBitmapFontChars(data: PhaserBmfontData): string {
		return Object.keys(data.chars)
			.map((charCodeStr) => parseInt(charCodeStr))
			.map((charCode) => String.fromCharCode(charCode))
			.join('')
	}

	private addKeyboadCallbacks() {
		this.onKeyDown('R', this.restart, this, this.shutdownSignal)
		this.onKeyDown('F', this.alignCameraToProjectFrame, this, this.shutdownSignal)

		this.onKeyDown('DELETE', this.removeSelection, this, this.shutdownSignal)
		this.onKeyDown('BACKSPACE', this.removeSelection, this, this.shutdownSignal)

		this.onKeyDown('LEFT', (e) => this.moveSelection(-1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('RIGHT', (e) => this.moveSelection(1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('UP', (e) => this.moveSelection(0, -1, e), this, this.shutdownSignal)
		this.onKeyDown('DOWN', (e) => this.moveSelection(0, 1, e), this, this.shutdownSignal)

		this.onKeyDown('OPEN_BRACKET', (event) => this.moveSelectionDownInHierarchy(event), this, this.shutdownSignal)
		this.onKeyDown('CLOSED_BRACKET', (event) => this.moveSelectionUpInHierarchy(event), this, this.shutdownSignal)

		this.onKeyDown('G', (event) => this.processGrouping(event), this, this.shutdownSignal)

		this.onKeyDown('X', (event) => this.cut(event), this, this.shutdownSignal)
		this.onKeyDown('C', (event) => this.copy(event), this, this.shutdownSignal)
		this.onKeyDown('V', (event) => this.paste(event), this, this.shutdownSignal)

		this.onKeyDown('ZERO', this.resetSelectionTransform, this, this.shutdownSignal)

		this.onKeyDown('ONE', () => this.setCameraZoom(1), this, this.shutdownSignal)
		this.onKeyDown('TWO', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.5 : 2), this, this.shutdownSignal)
		this.onKeyDown('THREE', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.25 : 4), this, this.shutdownSignal)
	}

	private processGrouping(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		const editContext = this.editContexts.current!
		if (!editContext) {
			return
		}

		const selected = editContext.selection
		if (!selected || selected.isEmpty) {
			return
		}

		if (event.shiftKey) {
			this.ungroup(selected, editContext)
		} else {
			this.group(selected, editContext)
		}

		event.preventDefault()
	}

	private group(selection: Selection, editContext: EditContext): EditableContainer {
		const bounds =
			selection.objects.length === 1 ? this.aligner.getRotatedBounds(selection.objects[0]) : selection.bounds
		const group = this.objectsFactory.container()
		group.name = this.getNewObjectName(editContext, group)
		group.setPosition(bounds.centerX, bounds.centerY)
		group.setSize(bounds.width, bounds.height)
		editContext.target.add(group)

		this.logger.debug(`grouped ${selection.objectsAsString} -> '${group.name}'`)

		selection.objects.forEach((obj) => {
			group.add(obj)
			obj.x -= group.x
			obj.y -= group.y
		})
		selection.destroy()

		editContext.selection = editContext.createSelection([group])
		editContext.transformControls.startFollow(editContext.selection)

		return group
	}

	private ungroup(selection: Selection, editContext: EditContext) {
		const groups = selection.objects.filter((obj) => obj instanceof EditableContainer)
		if (groups.length === 0) {
			return
		}

		const ungrouped = groups.flatMap((group) => {
			const sin = Math.sin(group.rotation)
			const cos = Math.cos(group.rotation)

			const ungrouped = group.editables.map((child) => {
				// Calculate new position accounting for group angle and scale
				const dx = child.x * group.scaleX
				const dy = child.y * group.scaleY
				const rotatedX = dx * cos - dy * sin
				const rotatedY = dx * sin + dy * cos

				child.x = group.x + rotatedX
				child.y = group.y + rotatedY
				child.angle += group.angle
				child.scaleX *= group.scaleX
				child.scaleY *= group.scaleY
				editContext.target.add(child)
				return child
			})

			group.destroy()

			this.logger.debug(
				`ungrouped '${group.name}' -> [${ungrouped.map((obj) => obj.name || 'item').join(', ')}] (${ungrouped.length})`
			)

			return ungrouped
		})

		editContext.selection = editContext.createSelection(ungrouped)
		editContext.transformControls.startFollow(editContext.selection)

		return ungrouped
	}

	private copy(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		this.clipboard.copy(selection.objects)

		event.preventDefault()
	}

	private cut(event: KeyboardEvent): void {
		this.copy(event)
		this.removeSelection()
	}

	private paste(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		const copiedObjs = this.clipboard.paste()
		if (!copiedObjs) {
			return
		}

		const editContext = this.editContexts.current!

		copiedObjs.forEach((obj) => {
			obj.setPosition(obj.x + 30, obj.y + 30)
			obj.setName(this.getNewObjectName(editContext, obj))
			editContext.target.add(obj)
			this.logger.debug(`pasted '${obj.name}'`)
		})

		editContext.selection?.destroy()
		editContext.selection = editContext.createSelection(copiedObjs)
		editContext.transformControls.startFollow(editContext.selection)

		event.preventDefault()
	}

	public restart() {
		this.scene.restart(this.initData)
	}

	private removeSelection(): void {
		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		// create a copy of the objects array bc obj.destroy() will remove it from the original array `selection.objects`
		selection.objects.slice(0).forEach((obj) => {
			// delete it like this to trigger removeHandler in EditableContainer
			obj.parentContainer.remove(obj, true)
		})
	}

	private moveSelection(dx: number, dy: number = 0, event: KeyboardEvent): void {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		selected.move(dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1))

		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		selected.objects.forEach((obj) => {
			if (event.shiftKey) {
				obj.parentContainer.sendToBack(obj)
			} else {
				obj.parentContainer.moveDown(obj)
			}
		})
	}

	private moveSelectionUpInHierarchy(event: KeyboardEvent) {
		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		selected.objects.forEach((obj) => {
			if (event.shiftKey) {
				obj.parentContainer.bringToTop(obj)
			} else {
				obj.parentContainer.moveUp(obj)
			}
		})
	}

	private addPointerCallbacks() {
		this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut, this, this.shutdownSignal)
	}

	private onPointerDown(pointer: Phaser.Input.Pointer, objectsUnderPointer: Phaser.GameObjects.GameObject[]): void {
		const buttonType = this.getButtonType(pointer)

		match(buttonType)
			.with('left', () => {
				const clickedOnTransformControl = objectsUnderPointer.some((obj) => obj.getData(TransformControls.TAG))
				if (clickedOnTransformControl) {
					// this.logger.debug('clicked on transform control')
					return
				}

				const context = this.editContexts.current!
				if (!context) {
					return
				}

				const selection = context.selection
				if (selection) {
					const startDrag =
						selection.objects.length === 1
							? objectsUnderPointer.some((obj) => obj === selection.objects[0])
							: selection.bounds.contains(pointer.worldX, pointer.worldY)

					if (startDrag) {
						this.startSelectionDrag(selection, pointer, context)
						return
					}
				}

				objectsUnderPointer.some((obj) => {
					if (context.isRegistered(obj) && context.selection?.includes(obj)) {
						this.startSelectionDrag(context.selection, pointer, context)
						return true
					}
				})

				const wasProcessedByContext = objectsUnderPointer.some((obj) => {
					if (context.isRegistered(obj)) {
						return true
					}
				})

				if (wasProcessedByContext) {
					return
				}

				context.cancelSelection()

				const msSinceLastClick = Date.now() - (this.sceneClickedAt ?? 0)
				if (msSinceLastClick < 200) {
					this.editContexts.switchTo(this.root)
				}
				this.sceneClickedAt = Date.now()

				this.startDrawingSelectionRect(context, pointer)
			})
			.with('middle', () => this.startCameraDrag(pointer))
			.with('right', () => console.log('right button click'))
			.otherwise(() => console.warn('unknown button', buttonType))
	}

	private startDrawingSelectionRect(selection: EditContext, pointer: Phaser.Input.Pointer) {
		const pointerUpSignal = signalFromEvent(this.input, Phaser.Input.Events.POINTER_UP)

		const selectionRect = selection.selectionRect

		const drawFrom = { x: pointer.worldX, y: pointer.worldY }

		let setupWasCalled = false
		const setup = once(() => {
			selectionRect.revive()
			selectionRect.resetBounds()
			selection.setHoverMode('selection-rect')
			setupWasCalled = true
		})

		this.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				// setup will be called only on the first pointer move
				setup()

				// the rest will be called on every pointer move
				selectionRect.draw(drawFrom, { x: pointer.worldX, y: pointer.worldY })
			},
			this,
			AbortSignal.any([this.shutdownSignal, pointerUpSignal])
		)

		this.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				if (setupWasCalled === false) {
					return
				}

				// it is a hacky way to get the objects under selection rect but it works
				const objectsUnderSelectionRect = selection.objectsUnderSelectionRect.slice()
				selection.objectsUnderSelectionRect.length = 0

				selection.cancelSelection()

				if (objectsUnderSelectionRect.length > 0) {
					selection.selection = selection.createSelection(objectsUnderSelectionRect)
					selection.transformControls.startFollow(selection.selection)
				}

				selectionRect.kill()

				selection.setHoverMode('normal')
			},
			this,
			this.shutdownSignal
		)
	}

	private onPointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.getButtonType(pointer) === 'middle') {
			this.stopCameraDrag()
			return
		}

		if (this.getButtonType(pointer) === 'left') {
			this.stopSelectionDrag(this.editContexts.current!)
		}
	}

	private startCameraDrag(pointer: Phaser.Input.Pointer) {
		if (this.cameraDrag) {
			return
		}

		this.cameraDrag = true
		this.cameraDragStart = { x: pointer.x, y: pointer.y }

		this.game.canvas.style.cursor = 'grabbing'
	}

	private stopCameraDrag() {
		if (!this.cameraDrag) {
			return
		}

		this.cameraDrag = false
		this.cameraDragStart = undefined

		this.game.canvas.style.cursor = 'default'
	}

	public startSelectionDrag(selection: Selection, pointer: Phaser.Input.Pointer, context: EditContext) {
		if (this.selectionDrag) {
			return
		}

		const camera = this.cameras.main
		const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
		this.selectionDrag = {
			target: selection,
			currentX: selection.x,
			currentY: selection.y,
			offsetX: selection.x - x,
			offsetY: selection.y - y,
			lockAxis: 'none',
		}

		context.onDragStart(selection)
	}

	private stopSelectionDrag(editContext: EditContext) {
		if (!this.selectionDrag) {
			return
		}

		editContext.onDragEnd(this.selectionDrag.target)

		this.selectionDrag = undefined
	}

	private onPointerMove(pointer: Phaser.Input.Pointer): void {
		if (this.cameraDrag && this.cameraDragStart) {
			let dx = pointer.x - this.cameraDragStart.x
			let dy = pointer.y - this.cameraDragStart.y

			const camera = this.cameras.main
			camera.scrollX -= dx / camera.zoom
			camera.scrollY -= dy / camera.zoom
			this.cameraDragStart = { x: pointer.x, y: pointer.y }
			this.onResizeOrCameraChange()
		}

		if (this.selectionDrag) {
			const camera = this.cameras.main
			const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2

			if (this.selectionDrag.lockAxis === 'x') {
				this.selectionDrag.target.move(x + this.selectionDrag.offsetX - this.selectionDrag.currentX, 0)
			} else if (this.selectionDrag.lockAxis === 'y') {
				this.selectionDrag.target.move(0, y + this.selectionDrag.offsetY - this.selectionDrag.currentY)
			} else {
				this.selectionDrag.target.move(
					x + this.selectionDrag.offsetX - this.selectionDrag.currentX,
					y + this.selectionDrag.offsetY - this.selectionDrag.currentY
				)
			}

			this.selectionDrag.currentX = this.selectionDrag.target.x
			this.selectionDrag.currentY = this.selectionDrag.target.y
		}
	}

	private getButtonType(pointer: Phaser.Input.Pointer): 'left' | 'middle' | 'right' {
		return pointer.button === 0 ? 'left' : pointer.button === 1 ? 'middle' : 'right'
	}

	private onPointerWheel(
		pointer: Phaser.Input.Pointer,
		objects: Phaser.GameObjects.GameObject[],
		dx: number,
		dy: number
	): void {
		let camera = this.cameras.main

		let factor = pointer.event.ctrlKey || pointer.event.metaKey ? 1.3 : 1.1
		let newZoom = camera.zoom

		let direction = Phaser.Math.Sign(dy) * -1
		if (direction > 0) {
			// Zooming in
			newZoom *= factor
		} else {
			// Zooming out
			newZoom /= factor
		}

		newZoom = Phaser.Math.Clamp(newZoom, 0.05, 30)
		newZoom = Phaser.Math.RoundTo(newZoom, -2)

		this.zoomToPointer(newZoom, pointer)

		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private zoomToPointer(newZoom: number, pointer: Phaser.Input.Pointer): void {
		const camera = this.cameras.main

		const pointerPosBeforeZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Change the camera zoom
		camera.zoom = newZoom

		// hack to update the camera matrix and get the new pointer position
		// @ts-expect-error
		camera.preRender()

		const pointerPosAfterZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Adjust camera position to keep the pointer in the same world position
		camera.scrollX -= pointerPosAfterZoom.x - pointerPosBeforeZoom.x
		camera.scrollY -= pointerPosAfterZoom.y - pointerPosBeforeZoom.y
	}

	private resetSelectionTransform(): void {
		const selection = this.editContexts.current?.selection
		if (!selection) {
			return
		}

		selection.objects.forEach((obj) => {
			obj.setRotation(0)
			obj.setScale(1)
		})

		selection.updateBounds()
	}

	private setCameraZoom(zoom: number): void {
		this.cameras.main.zoom = zoom
		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private onPointerGameOut(): void {}

	public resize(): void {
		super.resize()

		this.onResizeOrCameraChange(this.scale.gameSize)
	}

	private onResizeOrCameraChange(gameSize?: Phaser.Structs.Size) {
		gameSize ??= this.scale.gameSize

		let camera = this.cameras.main
		this.grid.redraw(gameSize, camera, camera.scrollX, camera.scrollY)
		this.rulers.redraw(gameSize, camera.zoom, camera.scrollX, camera.scrollY)

		state.canvas.camera.zoom = camera.zoom
		state.canvas.camera.scrollX = camera.scrollX
		state.canvas.camera.scrollY = camera.scrollY
	}

	private alignCameraToProjectFrame() {
		const camera = this.cameras.main

		const projectSize = this.initData.project.config.size
		camera.scrollX = -(camera.width - projectSize.width) / 2
		camera.scrollY = -(camera.height - projectSize.height) / 2

		const zoomPaddingX = camera.width * 0.1
		const zoomPaddingY = camera.height * 0.1
		camera.zoom = Math.min(
			camera.width / (projectSize.width + zoomPaddingX),
			camera.height / (projectSize.height + zoomPaddingY)
		)

		this.onResizeOrCameraChange()
	}

	public update(time: number, deltaMs: number): void {
		this.editContexts.update(deltaMs)
	}

	public onShutdown(): void {
		this.logger.debug(`${this.scene.key} shutdown - start`)

		super.onShutdown()

		this.editContexts.destroy()

		this.clipboard?.destroy()
		// @ts-expect-error
		this.clipboard = undefined

		state.canvas.objects = null
		state.canvas.objectById = () => undefined

		this.objectsFactory.destroy()

		this.componentsFactory.destroy()

		this.logger.debug(`${this.scene.key} shutdown - complete`)
	}
}
