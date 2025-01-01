import { urlParams } from '@url-params'
import { once } from 'es-toolkit'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { logs } from '../../../../../logs/logs'
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
import { rectIntersect } from '../../robowhale/phaser3/geom/rect-intersect'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { signalFromEvent } from '../../robowhale/utils/events/create-abort-signal-from-event'
import { CanvasClipboard } from './CanvasClipboard'
import { EditContext } from './EditContext'
import { isSerializableGameObject, ObjectsFactory, SerializableGameObject } from './factory/ObjectsFactory'
import { Grid } from './Grid'
import { Rulers } from './Rulers'
import { Selection } from './selection/Selection'
import { isSelectable, SelectionManager } from './selection/SelectionManager'

export type MainSceneInitData = {
	project: Project
}

type SelectionDragData = {
	obj: Selection
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
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private grid!: Grid
	private rulers!: Rulers
	private root!: Phaser.GameObjects.Container
	private projectSizeFrame!: Phaser.GameObjects.Graphics
	public objectsFactory!: ObjectsFactory
	private clipboard!: CanvasClipboard
	private editContexts!: Map<Phaser.GameObjects.Container, EditContext>
	private editContextCurrent: EditContext | undefined
	private selectionManager!: SelectionManager

	public init(data: MainSceneInitData) {
		super.init(data)

		this.logger = logs.getOrCreate('canvas')

		this.logger.info('MainScene init', data)
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

		this.root = this.add.container(0, 0)
		this.root.name = 'root' // TODO use the current prefab name (from the assets tree)

		this.initObjectsFactory()

		this.initClipboard()

		this.initEditContexts()

		this.initSelectionManager()

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
		this.editContexts = new Map()
	
		this.addEditContext(this.root, true)
	}

	private addEditContext(container: Phaser.GameObjects.Container, switchTo = false) {
		if (this.editContexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' already exists`)
		}
		
		const editContext = new EditContext({
			scene: this,
			target: container,
		})
		
		editContext.once('pre-destroy', () => this.removeEditContext(container), this, this.shutdownSignal)
		
		this.editContexts.set(container, editContext)
		
		this.logger.debug(`added edit context for '${container.name}'`)
		
		if (switchTo) {
			this.switchEditContext(container)
		}
		
		return editContext
	}
	
	private removeEditContext(container: Phaser.GameObjects.Container) {
		if (!this.editContexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}

		this.logger.debug(`removed edit context for '${container.name}'`)
		
		this.editContexts.delete(container)
	}

	public switchEditContext(container: Phaser.GameObjects.Container): EditContext {
		if (this.editContextCurrent?.target === container) {
			return this.editContextCurrent
		}

		const editContext = this.editContexts.get(container)
		if (!editContext) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}
		
		this.editContextCurrent = editContext

		this.logger.info(`switched to '${container.name}' context`)

		return editContext
	}

	private initSelectionManager() {
		this.selectionManager = new SelectionManager({
			scene: this,
			logger: this.logger.getSubLogger({ name: ':selection' }),
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

		const chefCherry_1 = await this.addTestImage(chefCherryFrame, -200, 0)
		chefCherry_1?.setName('chefCherry_1')

		const chefCherry_2 = await this.addTestImage(chefCherryFrame, 200, 0)
		chefCherry_2?.setAngle(45)
		chefCherry_2?.setName('chefCherry_2')

		const selection = this.selectionManager.createSelection([chefCherry_1!, chefCherry_2!])
		this.group(selection)
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

		this.selectionManager.addSelectable(gameObject)

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

		this.onKeyDown(
			'G',
			(event) => {
				if (!event.ctrlKey && !event.metaKey) {
					return
				}

				if (!this.selectionManager.selected || this.selectionManager.selected.isEmpty) {
					return
				}

				if (event.shiftKey) {
					this.ungroup(this.selectionManager.selected)
				} else {
					this.group(this.selectionManager.selected)
				}

				event.preventDefault()
			},
			this,
			this.shutdownSignal
		)

		this.onKeyDown('X', (event) => this.cut(event), this, this.shutdownSignal)
		this.onKeyDown('C', (event) => this.copy(event), this, this.shutdownSignal)
		this.onKeyDown('V', (event) => this.paste(event), this, this.shutdownSignal)

		this.onKeyDown('ONE', () => this.setCameraZoom(1), this, this.shutdownSignal)
		this.onKeyDown('TWO', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.5 : 2), this, this.shutdownSignal)
		this.onKeyDown('THREE', ({ shiftKey }) => this.setCameraZoom(shiftKey ? 0.25 : 4), this, this.shutdownSignal)
	}

	private group(selection: Selection) {
		const group = this.make.container({})
		group.name = this.getNewGroupName()
		group.setPosition(selection.x + selection.width / 2, selection.y + selection.height / 2)
		group.setSize(selection.width, selection.height)
		this.root.add(group)

		const grouped = selection.objects.map((obj) => obj.name || 'item').join(', ')
		this.logger.debug(`grouped [${grouped}] (${selection.objects.length}) -> '${group.name}'`)

		selection.objects.forEach((obj) => {
			group.add(obj)
			obj.x -= group.x
			obj.y -= group.y

			this.selectionManager.removeSelectable(obj)
		})
		selection.destroy()

		this.selectionManager.addSelectable(group)
		this.selectionManager.selected = this.selectionManager.createSelection([group])
		this.selectionManager.transformControls.startFollow(this.selectionManager.selected)

		return group
	}

	private getNewGroupName(): string {
		const existingGroups = this.root.list.filter((child) => child.name.startsWith('group_'))
		return `group_${existingGroups.length + 1}`
	}

	private ungroup(selection: Selection) {
		const groups = selection.objects.filter((obj) => obj instanceof Phaser.GameObjects.Container)
		if (groups.length === 0) {
			return
		}

		const ungrouped = groups.flatMap((group) => {
			const ungrouped = group.list.slice(0).map((child) => {
				if (!isSelectable(child)) {
					throw new Error(`Ungrouping failed: ${child.name} is not selectable`)
				}

				child.x += group.x
				child.y += group.y
				this.root.add(child)
				this.selectionManager.addSelectable(child)
				return child
			})

			group.destroy()

			this.logger.debug(
				`ungrouped ${group.name} -> [${ungrouped.map((obj) => obj.name || 'item').join(', ')}] (${ungrouped.length})`
			)

			return ungrouped
		})

		this.selectionManager.selected = this.selectionManager.createSelection(ungrouped)
		this.selectionManager.transformControls.startFollow(this.selectionManager.selected)

		return ungrouped
	}

	private copy(event: KeyboardEvent): void {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		if (!this.selectionManager.selected) {
			return
		}

		const hasNonSerializableObjects = this.selectionManager.selected.objects.filter(
			(obj) => !isSerializableGameObject(obj)
		)
		if (hasNonSerializableObjects.length > 0) {
			throw new Error(
				`copy failed: ${hasNonSerializableObjects.map((obj) => obj.name).join(', ')} are not serializable`
			)
		}

		this.clipboard.copy(this.selectionManager.selected.objects as SerializableGameObject[])

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

		// TODO it should be added to the current edit context and it is not always the main scene
		this.root.add(copiedObjs)

		copiedObjs.forEach((obj) => {
			obj.x += 30
			obj.y += 30
			// TODO get names for the objects
		})

		copiedObjs.forEach((obj) => {
			this.selectionManager.addSelectable(obj)
		})

		this.selectionManager.selected?.destroy()
		this.selectionManager.selected = this.selectionManager.createSelection(copiedObjs)
		this.selectionManager.transformControls.startFollow(this.selectionManager.selected)

		event.preventDefault()
	}

	public restart() {
		this.scene.restart(this.initData)
	}

	private removeSelection(): void {
		const selection = this.selectionManager.selected
		if (!selection) {
			return
		}

		// create a copy of the objects array bc obj.destroy() will remove it from the original array `selection.objects`
		selection.objects.slice(0).forEach((obj) => {
			obj.destroy()
		})
	}

	private moveSelection(dx: number, dy: number = 0, event: KeyboardEvent): void {
		const selected = this.selectionManager.selected
		if (!selected) {
			return
		}

		selected.move(dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1))

		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		const selection = this.selectionManager.selected
		if (!selection) {
			return
		}

		selection.objects.forEach((obj) => {
			if (event.shiftKey) {
				obj.parentContainer.sendToBack(obj)
			} else {
				obj.parentContainer.moveDown(obj)
			}
		})
	}

	private moveSelectionUpInHierarchy(event: KeyboardEvent) {
		const selection = this.selectionManager.selected
		if (!selection) {
			return
		}

		selection.objects.forEach((obj) => {
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

	private onPointerDown(pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]): void {
		const buttonType = this.getButtonType(pointer)

		match(buttonType)
			.with('left', () => {
				if (this.selectionManager.selected?.bounds.contains(pointer.worldX, pointer.worldY)) {
					this.startSelectionDrag(this.selectionManager.selected, pointer)
					return
				}

				objects.some((obj) => {
					if (this.selectionManager.isSelectable(obj) && this.selectionManager.selected?.includes(obj)) {
						this.startSelectionDrag(this.selectionManager.selected, pointer)
						return true
					}
				})

				const wasProcessedBySelection = objects.some((obj) => {
					if (this.selectionManager.isSelectable(obj)) {
						return true
					}
				})

				const clickedOnTransformControls = objects.some(
					// TODO find a better way to check if the click was on the transform controls
					(obj) => obj.parentContainer.parentContainer === this.selectionManager!.transformControls
				)
				if (clickedOnTransformControls) {
					return
				}

				if (!wasProcessedBySelection) {
					this.selectionManager!.cancelSelection()
				}

				this.startDrawingSelectionRect(pointer)
			})
			.with('middle', () => this.startCameraDrag(pointer))
			.with('right', () => console.log('right button click'))
			.otherwise(() => console.warn('unknown button', buttonType))
	}

	private startDrawingSelectionRect(pointer: Phaser.Input.Pointer) {
		const pointerUpSignal = signalFromEvent(this.input, Phaser.Input.Events.POINTER_UP)

		const selectionRect = this.selectionManager!.selectionRect

		const drawFrom = { x: pointer.worldX, y: pointer.worldY }

		let setupWasCalled = false
		const setup = once(() => {
			selectionRect.revive()
			selectionRect.resetBounds()
			this.selectionManager!.setHoverMode('selection-rect')
			setupWasCalled = true
		})

		this.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				setup()
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

				const objectsUnderSelectionRect = this.selectionManager.selectables.filter((obj) => {
					return rectIntersect(selectionRect.bounds, obj.getBounds(), false)
				})

				this.selectionManager.selected?.destroy()

				if (objectsUnderSelectionRect.length > 0) {
					this.selectionManager.selected = this.selectionManager.createSelection(objectsUnderSelectionRect)
					this.selectionManager.transformControls.startFollow(this.selectionManager.selected)
				}

				selectionRect.kill()

				this.selectionManager!.setHoverMode('normal')
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
			this.stopSelectionDrag()
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

	private startSelectionDrag(selection: Selection, pointer: Phaser.Input.Pointer) {
		if (this.selectionDrag) {
			return
		}

		const camera = this.cameras.main
		const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
		this.selectionDrag = {
			obj: selection,
			currentX: selection.x,
			currentY: selection.y,
			offsetX: selection.x - x,
			offsetY: selection.y - y,
			lockAxis: 'none',
		}

		this.selectionManager!.onDragStart(selection)
	}

	private stopSelectionDrag() {
		if (!this.selectionDrag) {
			return
		}

		this.selectionManager!.onDragEnd(this.selectionDrag.obj)

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
				this.selectionDrag.obj.move(x + this.selectionDrag.offsetX - this.selectionDrag.currentX, 0)
			} else if (this.selectionDrag.lockAxis === 'y') {
				this.selectionDrag.obj.move(0, y + this.selectionDrag.offsetY - this.selectionDrag.currentY)
			} else {
				this.selectionDrag.obj.move(
					x + this.selectionDrag.offsetX - this.selectionDrag.currentX,
					y + this.selectionDrag.offsetY - this.selectionDrag.currentY
				)
			}

			this.selectionDrag.currentX = this.selectionDrag.obj.x
			this.selectionDrag.currentY = this.selectionDrag.obj.y
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
		super.onShutdown()
		
		this.editContexts.forEach((editContext) => editContext.destroy())
		this.editContexts.clear()

		this.selectionManager?.destroy()
		// @ts-expect-error
		this.selectionManager = undefined

		this.clipboard?.destroy()
		// @ts-expect-error
		this.clipboard = undefined
	}
}
