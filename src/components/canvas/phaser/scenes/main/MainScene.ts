import { match } from 'ts-pattern'
import { AppCommandsEmitter } from '../../../../../AppCommands'
import { Project } from '../../../../../project/Project'
import { ProjectConfig } from '../../../../../project/ProjectConfig'
import trpc from '../../../../../trpc'
import { AssetTreeImageData, AssetTreeItemData, AssetTreeSpritesheetFrameData, fetchImageUrl, GraphicAssetData } from '../../../../../types/assets'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { Rulers } from './Axes'
import { Grid } from './Grid'
import { Selectable, SelectionManager } from './selection/SelectionManager'

export type MainSceneInitData = {
	project: Project
}

export class MainScene extends BaseScene {
	public initData!: MainSceneInitData
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private objectDrag: { obj: Selectable; offsetX: number; offsetY: number } | undefined
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

		this.addTestImage()
	}

	private async addTestImage() {
		const frame = {
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

		this.handleAssetDrop({
			asset: frame,
			position: { x: this.initData.project.config.size.width / 2 - frame.size.w / 2, y: this.initData.project.config.size.height / 2 - frame.size.h / 2 },
		})
	}

	private setupAppCommands() {
		const appCommands = (this.game as PhaserGameExtra).appCommands as AppCommandsEmitter

		appCommands.on('handle-asset-drop', this.handleAssetDrop, this, undefined, this.shutdownSignal)
	}

	private async handleAssetDrop(data: { asset: AssetTreeItemData; position: { x: number; y: number } }) {
		const gameObject = await this.createGameObjectFromAsset(data.asset)
		if (!gameObject) {
			return
		}

		this.selectionManager.addSelectable(gameObject)

		gameObject.setOrigin(0, 0)
		gameObject.setPosition(data.position.x, data.position.y)

		this.container.add(gameObject)
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

		this.onKeyDown('DELETE', this.removeSelectedGameObject, this, this.shutdownSignal)
		this.onKeyDown('BACKSPACE', this.removeSelectedGameObject, this, this.shutdownSignal)

		this.onKeyDown('LEFT', (e) => this.moveSelectedGameObject(-1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('RIGHT', (e) => this.moveSelectedGameObject(1, 0, e), this, this.shutdownSignal)
		this.onKeyDown('UP', (e) => this.moveSelectedGameObject(0, -1, e), this, this.shutdownSignal)
		this.onKeyDown('DOWN', (e) => this.moveSelectedGameObject(0, 1, e), this, this.shutdownSignal)
	}

	private removeSelectedGameObject(): void {
		const selected = this.selectionManager.selectedGameObject
		if (!selected) {
			return
		}

		this.selectionManager.removeSelectable(selected)
		selected.destroy()
	}

	private moveSelectedGameObject(dx: number, dy: number = 0, event: KeyboardEvent): void {
		const selected = this.selectionManager.selectedGameObject
		if (!selected) {
			return
		}

		selected.x += dx * (event.shiftKey ? 10 : 1)
		selected.y += dy * (event.shiftKey ? 10 : 1)
		event.preventDefault()
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
				const wasSelected = objects.some((obj) => {
					if (this.selectionManager!.isSelectable(obj)) {
						this.startObjectDrag(obj, pointer)
						return true
					}
				})

				const clickedOnTransformControls = objects.some((obj) => obj.parentContainer === this.selectionManager!.transformControls)
				if (clickedOnTransformControls) {
					return
				}

				if (!wasSelected) {
					this.selectionManager!.cancelSelection()
				}
			})
			.with('middle', () => this.startCameraDrag(pointer))
			.with('right', () => console.log('right button click'))
			.otherwise(() => console.warn('unknown button', buttonType))
	}

	private onPointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.getButtonType(pointer) === 'middle') {
			this.stopCameraDrag()
			return
		}

		if (this.getButtonType(pointer) === 'left') {
			this.stopObjectDrag()
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

	private startObjectDrag(gameObject: Selectable, pointer: Phaser.Input.Pointer) {
		if (this.objectDrag) {
			return
		}

		const camera = this.cameras.main
		const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
		this.objectDrag = { obj: gameObject, offsetX: gameObject.x - x, offsetY: gameObject.y - y }

		this.selectionManager!.onDragStart(gameObject)
	}

	private stopObjectDrag() {
		if (!this.objectDrag) {
			return
		}

		this.selectionManager!.onDragEnd(this.objectDrag.obj)

		this.objectDrag = undefined
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

		if (this.objectDrag) {
			const camera = this.cameras.main
			const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2
			this.objectDrag.obj.x = x + this.objectDrag.offsetX
			this.objectDrag.obj.y = y + this.objectDrag.offsetY
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
