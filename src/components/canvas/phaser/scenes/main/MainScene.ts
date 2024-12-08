import { once } from 'es-toolkit'
import { match } from 'ts-pattern'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { Project } from '../../../../../project/Project'
import { ProjectConfig } from '../../../../../project/ProjectConfig'
import trpc from '../../../../../trpc'
import { AssetTreeImageData, AssetTreeItemData, AssetTreeSpritesheetFrameData, fetchImageUrl, GraphicAssetData } from '../../../../../types/assets'
import { rectIntersect } from '../../robowhale/phaser3/geom/rect-intersect'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { signalFromEvent } from '../../robowhale/utils/events/create-abort-signal-from-event'
import { Rulers } from './Rulers'
import { Grid } from './Grid'
import { Selection } from './selection/Selection'
import { SelectionManager } from './selection/SelectionManager'

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
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private grid!: Grid
	private rulers!: Rulers
	private container!: Phaser.GameObjects.Container
	private selectionManager!: SelectionManager
	private projectSizeFrame!: Phaser.GameObjects.Graphics

	init(data: MainSceneInitData) {
		super.init(data)

		console.log('MainScene init', data)
	}

	create() {
		if (!this.initData) {
			throw new Error('MainScene.initData is not set')
		}

		this.grid = new Grid(this)
		this.grid.name = 'grid'
		this.add.existing(this.grid)

		this.rulers = new Rulers(this)
		this.rulers.name = 'rulers'
		this.add.existing(this.rulers)

		this.container = this.add.container(0, 0)

		this.addSelectionManager()

		this.addProjectSizeFrame(this.initData.project.config.size)

		this.addKeyboadCallbacks()

		this.addPointerCallbacks()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		this.onResize(this.scale.gameSize)

		this.alignCameraToProjectFrame()

		this.setupAppCommands()

		this.addTestImages()
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

		const chefCherry_2 = await this.addTestImage(chefCherryFrame, 200, 0)
	}

	private async addTestImage(asset: GraphicAssetData, offsetX: number, offsetY: number, angle = 0) {
		const gameObject = await this.handleAssetDrop({
			asset,
			position: { x: this.initData.project.config.size.width / 2, y: this.initData.project.config.size.height / 2 },
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

		this.container.add(gameObject)

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

	private addSelectionManager() {
		this.selectionManager = new SelectionManager(this)
	}

	private addProjectSizeFrame(size: ProjectConfig['size']) {
		this.projectSizeFrame = this.add.graphics()
		this.projectSizeFrame.lineStyle(1, 0xffffff, 1)
		this.projectSizeFrame.strokeRect(0, 0, size.width, size.height)
		// this.projectSizeFrame.fillStyle(0x2f0559, 0.25)
		// this.projectSizeFrame.fillRect(0, 0, size.width, size.height)
	}

	private addKeyboadCallbacks() {
		// TODO implement restart scene
		this.onKeyDown('R', this.restart, this, this.shutdownSignal)
		this.onKeyDown('F', this.alignCameraToProjectFrame, this, this.shutdownSignal)
		this.onKeyDown('ONE', this.resetCameraZoom, this, this.shutdownSignal)

		this.onKeyDown('DELETE', this.removeSelection, this, this.shutdownSignal)
		this.onKeyDown('BACKSPACE', this.removeSelection, this, this.shutdownSignal)

		this.onKeyDown('LEFT', (e) => this.moveSelection(-1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('RIGHT', (e) => this.moveSelection(1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('UP', (e) => this.moveSelection(0, -1, e), this, this.shutdownSignal)
		this.onKeyDown('DOWN', (e) => this.moveSelection(0, 1, e), this, this.shutdownSignal)

		this.onKeyDown('OPEN_BRACKET', (event) => this.moveSelectionDownInHierarchy(event), this, this.shutdownSignal)
		this.onKeyDown('CLOSED_BRACKET', (event) => this.moveSelectionUpInHierarchy(event), this, this.shutdownSignal)

		// this.onKeyDown('G', (event) => this.group(event), this, this.shutdownSignal)
	}

	public restart() {
		this.scene.restart(this.initData)
	}

	private removeSelection(): void {
		const selection = this.selectionManager.selection
		if (!selection) {
			return
		}

		// create a copy of the objects array bc obj.destroy() will remove it from the original array `selection.objects`
		selection.objects.slice(0).forEach((obj) => {
			obj.destroy()
		})
	}

	private moveSelection(dx: number, dy: number = 0, event: KeyboardEvent): void {
		const selected = this.selectionManager.selection
		if (!selected) {
			return
		}

		selected.move(dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1))

		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		const selection = this.selectionManager.selection
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
		const selection = this.selectionManager.selection
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
				if (this.selectionManager.selection?.bounds.contains(pointer.worldX, pointer.worldY)) {
					this.startSelectionDrag(this.selectionManager.selection, pointer)
					return
				}

				objects.some((obj) => {
					if (this.selectionManager.isSelectable(obj) && this.selectionManager.selection?.includes(obj)) {
						this.startSelectionDrag(this.selectionManager.selection, pointer)
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

				this.selectionManager.selection?.destroy()

				if (objectsUnderSelectionRect.length > 0) {
					this.selectionManager.selection = this.selectionManager.createSelection(objectsUnderSelectionRect)
					this.selectionManager.transformControls.startFollow(this.selectionManager.selection)
				}

				selectionRect.kill()
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
	}

	private stopCameraDrag() {
		if (!this.cameraDrag) {
			return
		}

		this.cameraDrag = false
		this.cameraDragStart = undefined
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
			this.onCameraChange()
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

	private resetCameraZoom() {
		const cameraZoom = 1
		this.setCameraZoom(cameraZoom)
		this.onResize(this.scale.gameSize)
	}

	private onPointerWheel(pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], dx: number, dy: number): void {
		let camera = this.cameras.main

		const pointerPositionBefore = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		let k = pointer.event.shiftKey ? 2 : 1
		let delta = Phaser.Math.Sign(dy) * -0.1 * k
		let newZoom = Phaser.Math.RoundTo(Math.max(0.1, camera.zoom + delta), -2)
		this.setCameraZoom(newZoom)

		const pointerPositionAfter = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// TODO fix this, it doesn't work as expected
		camera.scrollX += pointerPositionAfter.x - pointerPositionBefore.x
		camera.scrollY += pointerPositionAfter.y - pointerPositionBefore.y

		this.onResize(this.scale.gameSize)
	}

	private setCameraZoom(zoom: number): void {
		this.cameras.main.zoom = zoom
	}

	private onCameraChange() {
		let camera = this.cameras.main
		this.grid.redraw(this.scale.gameSize, camera)
		this.rulers.redraw(this.scale.gameSize, camera.zoom, camera.scrollX, camera.scrollY)
	}

	private onPointerGameOut(): void {}

	public resize(): void {
		super.resize()

		this.onResize(this.scale.gameSize)
	}

	onResize(gameSize?: Phaser.Structs.Size) {
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
		camera.zoom = Math.min(camera.width / (projectSize.width + zoomPaddingX), camera.height / (projectSize.height + zoomPaddingY))

		this.onResize()
	}

	public onShutdown(): void {
		super.onShutdown()

		this.selectionManager?.destroy()
		this.selectionManager = undefined
	}
}
