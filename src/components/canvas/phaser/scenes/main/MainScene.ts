import { urlParams } from '@url-params'
import { once } from 'es-toolkit'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { logger } from '../../../../../logs/logs'
import { Project } from '../../../../../project/Project'
import { ProjectConfig } from '../../../../../project/ProjectConfig'
import trpc from '../../../../../trpc'
import {
	AssetTreeImageData,
	AssetTreeItemData,
	AssetTreeSpritesheetFrameData,
	fetchImageUrl,
	GraphicAssetData,
} from '../../../../../types/assets'
import { EventfulContainer } from '../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { signalFromEvent } from '../../robowhale/utils/events/create-abort-signal-from-event'
import { CanvasClipboard } from './CanvasClipboard'
import { EditContext, isSelectable, shouldIgnoreObject } from './editContext/EditContext'
import { EditContextsManager } from './editContext/EditContextsManager'
import { Selection } from './editContext/Selection'
import { TransformControls } from './editContext/TransformControls'
import { isSerializableGameObject, ObjectsFactory, SerializableGameObject } from './factory/ObjectsFactory'
import { Grid } from './Grid'
import { Rulers } from './Rulers'

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

/**
 * TODO
 * [ ] add selection rect to select multiple objects with mouse
 * [ ] allow to group selected objects (create a new container and add all selected objects to it)
 * [ ] allow to ungroup (detach all children from this container and make them children of this container's parent)
 */

export class MainScene extends BaseScene {
	public declare initData: MainSceneInitData
	private logger!: Logger<{}>
	private sceneClickedAt: number | undefined
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private grid!: Grid
	private rulers!: Rulers
	private root!: EventfulContainer
	private projectSizeFrame!: Phaser.GameObjects.Graphics
	public objectsFactory!: ObjectsFactory
	private clipboard!: CanvasClipboard
	private editContexts!: EditContextsManager

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

		this.root = this.add.eventfulContainer()
		this.root.name = 'root' // TODO use the current prefab name (from the assets tree)

		this.initObjectsFactory()

		this.initClipboard()

		this.initEditContexts()

		this.addProjectSizeFrame(this.initData.project.config.size)

		this.addKeyboadCallbacks()

		this.addPointerCallbacks()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		this.onResizeOrCameraChange(this.scale.gameSize)

		this.alignCameraToProjectFrame()

		this.setupAppCommands()

		this.addTestImages()

		const zoom = urlParams.getNumber('zoom')
		if (typeof zoom === 'number') {
			this.setCameraZoom(zoom)
		}
	}

	private initObjectsFactory() {
		this.objectsFactory = new ObjectsFactory({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':objects-factory' }),
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

		this.editContexts.add(this.root, {
			switchTo: true,
		})
	}

	private addProjectSizeFrame(size: ProjectConfig['size']) {
		this.projectSizeFrame = this.add.graphics()
		this.projectSizeFrame.lineStyle(1, 0xffffff, 1)
		this.projectSizeFrame.strokeRect(0, 0, size.width, size.height)
		// this.projectSizeFrame.fillStyle(0x2f0559, 0.25)
		// this.projectSizeFrame.fillRect(0, 0, size.width, size.height)
	}

	private async addTestImages(): Promise<void> {
		const chefCherryFrame = {
			type: 'spritesheet-frame',
			name: 'Chef Cherry',
			size: {
				w: 285,
				h: 375,
			},
			imagePath: '/Users/vlad/dev/papa-cherry-2/dev/assets/graphics/gameplay_gui.png',
			pathInHierarchy: 'level_complete/Chef Cherry',
			path: '/Users/vlad/dev/papa-cherry-2/dev/assets/graphics/gameplay_gui.png/level_complete/Chef Cherry',
			jsonPath: '/Users/vlad/dev/papa-cherry-2/dev/assets/graphics/gameplay_gui.json',
		} as AssetTreeSpritesheetFrameData

		const context = this.editContexts.current!

		const chefCherry_1 = await this.addTestImage(chefCherryFrame, -400, -400)
		chefCherry_1?.setName(this.getNewObjectName(context, chefCherry_1!, 'chefCherry_topLeft'))
		chefCherry_1?.setOrigin(0)

		const chefCherry_2 = await this.addTestImage(chefCherryFrame, 400, -400)
		chefCherry_2?.setName(this.getNewObjectName(context, chefCherry_2!, 'chefCherry_topRight'))
		chefCherry_2?.setOrigin(1, 0)

		const chefCherry_3 = await this.addTestImage(chefCherryFrame, 400, 500)
		chefCherry_3?.setName(this.getNewObjectName(context, chefCherry_3!, 'chefCherry_bottomRight'))
		chefCherry_3?.setOrigin(1)

		const chefCherry_4 = await this.addTestImage(chefCherryFrame, -400, 500)
		chefCherry_4?.setName(this.getNewObjectName(context, chefCherry_4!, 'chefCherry_bottomLeft'))
		chefCherry_4?.setOrigin(0, 1)

		const selection_1 = context.createSelection([chefCherry_1!, chefCherry_2!])
		const group_1 = this.group(selection_1, context)

		const selection_2 = context.createSelection([chefCherry_3!, chefCherry_4!])
		const group_2 = this.group(selection_2, context)

		const selection_3 = context.createSelection([group_1, group_2])
		const group_3 = this.group(selection_3, context)

		// const chefCherry_5 = await this.addTestImage(chefCherryFrame, 0, 800)
		// chefCherry_5?.setName(this.getNewObjectName(context, chefCherry_5!, 'chefCherry_center'))
		// chefCherry_5?.setOrigin(0.5)

		// const selection = context.createSelection([chefCherry_3!, chefCherry_4!])
		// context.transformControls.startFollow(selection)

		// const group_1 = this.group(selection, context)
		// group_1.setAngle(-15)

		// if (isSerializableGameObject(group_1)) {
		// 	const group_2 = this.objectsFactory.clone(group_1)
		// 	group_2.setPosition(group_1.x + 0, group_1.y + 500)
		// 	group_2.setName(this.getNewObjectName(this.editContexts.current!, group_2))
		// 	this.root.add(group_2)
		// 	this.editContexts.current!.setSelection([group_2])
		// }
	}

	private getNewObjectName(context: EditContext, obj: Phaser.GameObjects.GameObject, prefix?: string): string {
		const _prefix = prefix ?? this.extractNamePrefix(obj.name) ?? this.createNamePrefix(obj)
		const uid = Phaser.Math.RND.uuid().slice(0, 4)

		return `${_prefix}__${uid}`
	}

	private createNamePrefix(obj: Phaser.GameObjects.GameObject): string {
		return match(obj)
			.with({ type: 'Container' }, () => 'group')
			.with({ type: 'Image' }, () => {
				const image = obj as Phaser.GameObjects.Image
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
			gameObject.angle = angle
		}

		return gameObject
	}

	private setupAppCommands() {
		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter

		appCommands.on('handle-asset-drop', this.handleAssetDrop, this, undefined, this.shutdownSignal)
	}

	private async handleAssetDrop(data: { asset: AssetTreeItemData; position: { x: number; y: number } }) {
		const gameObject = await this.createGameObjectFromAsset(data.asset)
		if (!gameObject) {
			return null
		}

		gameObject.setOrigin(0.5, 0.5)
		gameObject.setPosition(data.position.x, data.position.y)

		this.root.add(gameObject)

		return gameObject
	}

	// TODO return Result
	private createGameObjectFromAsset(asset: AssetTreeItemData) {
		return (
			match(asset)
				.with({ type: 'image' }, async (image) => {
					let texture: Phaser.Textures.Texture | null = this.textures.get(image.path)
					if (!texture || texture.key === '__MISSING') {
						texture = await this.loadTexture(image)
					}

					if (!texture) {
						return null
					}

					return this.make.image({ key: texture.key }, false)
				})
				.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
					let texture: Phaser.Textures.Texture | null = this.textures.get(spritesheetFrame.imagePath)
					if (!texture || texture.key === '__MISSING') {
						texture = await this.loadTextureAtlas(spritesheetFrame)
					}

					if (!texture) {
						return null
					}

					return this.make.image({ key: texture.key, frame: spritesheetFrame.pathInHierarchy }, false)
				})
				// TODO handle fonts drop - create a new Phaser.GameObjects.BitmapText or Phaser.GameObjects.Text
				.otherwise(() => null)
		)
	}

	private async loadTexture(asset: GraphicAssetData): Promise<Phaser.Textures.Texture | null> {
		const img = await this.createImgForTexture(asset)
		if (!img) {
			return null
		}

		const textureKey = asset.path

		this.textures.addImage(textureKey, img)

		return this.textures.get(textureKey)
	}

	private async loadTextureAtlas(asset: AssetTreeSpritesheetFrameData): Promise<Phaser.Textures.Texture | null> {
		// TODO we create 'fake' image asset here to load the WHOLE spritesheet as a texture and not just a single frame
		const imgAsset: AssetTreeImageData = { type: 'image', path: asset.imagePath, name: '', size: { w: 0, h: 0 } }
		const img = await this.createImgForTexture(imgAsset)
		if (!img) {
			return null
		}

		const json = await trpc.readJson.query({ path: asset.jsonPath })
		if (!json) {
			return null
		}

		const textureKey = asset.imagePath

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

	private addKeyboadCallbacks() {
		// TODO implement restart scene
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

	private group(selection: Selection, editContext: EditContext): EventfulContainer {
		const group = this.make.eventfulContainer()
		group.name = this.getNewObjectName(editContext, group)
		group.setPosition(selection.x, selection.y)
		group.setSize(selection.width, selection.height)
		this.root.add(group)

		const grouped = selection.objects.map((obj) => obj.name || 'item').join(', ')
		this.logger.debug(`grouped [${grouped}] (${selection.objects.length}) -> '${group.name}'`)

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
		const groups = selection.objects.filter((obj) => obj instanceof EventfulContainer)
		if (groups.length === 0) {
			return
		}

		const ungrouped = groups.flatMap((group) => {
			const sin = Math.sin(group.rotation)
			const cos = Math.cos(group.rotation)

			const ungrouped = group.list
				.slice(0)
				.map((child) => {
					if (shouldIgnoreObject(child)) {
						return null
					}

					if (!isSelectable(child)) {
						throw new Error(`Ungrouping failed: ${child.name} is not selectable`)
					}

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
				.filter((child) => child !== null)

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

		const selected = this.editContexts.current?.selection
		if (!selected) {
			return
		}

		const hasNonSerializableObjects = selected.objects.filter((obj) => !isSerializableGameObject(obj))
		if (hasNonSerializableObjects.length > 0) {
			throw new Error(
				`copy failed: ${hasNonSerializableObjects.map((obj) => obj.name).join(', ')} are not serializable`
			)
		}

		this.clipboard.copy(selected.objects as SerializableGameObject[])

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

		editContext.target.add(copiedObjs)

		copiedObjs.forEach((obj) => {
			obj.x += 30
			obj.y += 30
			obj.name = this.getNewObjectName(editContext, obj)
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
			obj.destroy()
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

	private startSelectionDrag(selected: Selection, pointer: Phaser.Input.Pointer, selection: EditContext) {
		if (this.selectionDrag) {
			return
		}

		const camera = this.cameras.main
		const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
		this.selectionDrag = {
			target: selected,
			currentX: selected.x,
			currentY: selected.y,
			offsetX: selected.x - x,
			offsetY: selected.y - y,
			lockAxis: 'none',
		}

		selection.onDragStart(selected)
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

	public onShutdown(): void {
		this.logger.debug(`${this.scene.key} shutdown - start`)

		super.onShutdown()

		this.editContexts.destroy()

		this.clipboard?.destroy()
		// @ts-expect-error
		this.clipboard = undefined

		this.logger.debug(`${this.scene.key} shutdown - complete`)
	}
}
