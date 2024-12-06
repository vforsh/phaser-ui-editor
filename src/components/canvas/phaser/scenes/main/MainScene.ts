import { Project } from '../../../../../project/Project'
import { ProjectConfig } from '../../../../../project/ProjectConfig'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { Axes } from './Axes'
import { Grid } from './Grid'

export type MainSceneInitData = {
	project: Project
}

export class MainScene extends BaseScene {
	public initData: MainSceneInitData
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private grid: Grid
	private axes: Axes
	private container: Phaser.GameObjects.Container
	private projectSizeFrame: Phaser.GameObjects.Graphics

	init(data: MainSceneInitData) {
		super.init(data)

		console.log('MainScene init', data)
	}

	create() {
		if (!this.initData) {
			throw new Error('MainScene.initData is not set')
		}

		this.grid = new Grid(this)
		this.add.existing(this.grid)

		this.axes = new Axes(this)
		this.axes.visible = false
		this.add.existing(this.axes)

		this.container = this.add.container(0, 0)

		this.addProjectSizeFrame(this.initData.project.config.size)

		this.addKeyboadShortcuts()

		this.addPointerCallbacks()

		this.scale.on('resize', this.resize, this, this.shutdownSignal)

		this.onResize(this.scale.gameSize)

		this.alignCameraToProjectFrame()
	}

	addProjectSizeFrame(size: ProjectConfig['size']) {
		this.projectSizeFrame = this.add.graphics()
		this.projectSizeFrame.lineStyle(1, 0xffffff, 1)
		this.projectSizeFrame.strokeRect(0, 0, size.width, size.height)
		this.projectSizeFrame.fillStyle(0x2f0559, 0.25)
		this.projectSizeFrame.fillRect(0, 0, size.width, size.height)
	}

	private addKeyboadShortcuts() {}

	private addPointerCallbacks() {
		this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this, this.shutdownSignal)
		this.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut, this, this.shutdownSignal)
	}

	private onPointerDown(pointer: Phaser.Input.Pointer): void {
		if (this.isMiddleButton(pointer)) {
			this.startCameraDrag(pointer)
		}
	}

	private onPointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.isMiddleButton(pointer)) {
			this.stopCameraDrag()
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

	private onPointerMove(pointer: Phaser.Input.Pointer): void {
		if (this.cameraDrag) {
			if (this.cameraDragStart) {
				let dx = pointer.x - this.cameraDragStart.x
				let dy = pointer.y - this.cameraDragStart.y
				
				const camera = this.cameras.main
				camera.scrollX -= dx / camera.zoom
				camera.scrollY -= dy / camera.zoom
				this.cameraDragStart = { x: pointer.x, y: pointer.y }
				this.onCameraChange()
			}
		}
	}

	private isMiddleButton(pointer: Phaser.Input.Pointer) {
		// wheel button (at least for my mouse)
		return pointer.button === 1
	}

	private resetCameraZoom() {
		const cameraZoom = 1
		this.setCameraZoom(cameraZoom)
		this.onResize(this.scale.gameSize)
	}

	private onPointerWheel(pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], dx: number, dy: number): void {
		let camera = this.cameras.main
		let k = pointer.event.shiftKey ? 2 : 1
		let delta = Phaser.Math.Sign(dy) * -0.1 * k
		let newZoom = Phaser.Math.RoundTo(Math.max(0.1, camera.zoom + delta), -2)
		this.setCameraZoom(newZoom)

		this.onResize(this.scale.gameSize)
	}

	private setCameraZoom(zoom: number): void {
		this.cameras.main.zoom = zoom
		// console.log('zoom', Phaser.Math.RoundTo(zoom, -2))
	}

	private onCameraChange() {
		// console.log('camera', this.cameras.main.scrollX, this.cameras.main.scrollY, this.cameras.main.zoom)
		this.grid.redraw(this.scale.gameSize, this.cameras.main)
		this.axes.redraw(this.scale.gameSize, this.cameras.main.zoom, this.cameras.main.scrollX, this.cameras.main.scrollY)
	}

	private onPointerGameOut(): void {}

	public resize(): void {
		super.resize()

		this.onResize(this.scale.gameSize)
	}

	onResize(gameSize: Phaser.Structs.Size) {
		let camera = this.cameras.main
		this.grid.redraw(gameSize, camera)
		this.axes.redraw(gameSize, camera.zoom, camera.scrollX, camera.scrollY)
	}

	private alignCameraToProjectFrame() {
		const camera = this.cameras.main

		const projectSize = this.initData.project.config.size
		camera.scrollX = -(camera.width - projectSize.width) / 2
		camera.scrollY = -(camera.height - projectSize.height) / 2

		const zoomPadding = 50
		camera.zoom = Math.min(camera.width / (projectSize.width + zoomPadding), camera.height / (projectSize.height + zoomPadding))
	}

	public onShutdown(): void {
		super.onShutdown()

		// custom shutdown logic
	}
}
