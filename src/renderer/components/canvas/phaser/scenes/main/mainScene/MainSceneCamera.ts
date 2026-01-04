import { state } from '@state/State'

import { MainSceneDeps } from './mainSceneTypes'

export type CameraParams = {
	zoom?: number
	scrollX?: number
	scrollY?: number
}

export class MainSceneCamera {
	constructor(private deps: MainSceneDeps) {}

	public setZoom(zoom: number): void {
		this.deps.scene.cameras.main.zoom = zoom
		this.onResizeOrCameraChange()
	}

	/**
	 * Updates the main camera properties.
	 *
	 * @param params - New camera configuration
	 */
	public setCamera(params: CameraParams): void {
		const { zoom, scrollX, scrollY } = params
		if (zoom == null && scrollX == null && scrollY == null) {
			return
		}

		const camera = this.deps.scene.cameras.main

		if (zoom != null) {
			camera.setZoom(zoom)
		}

		if (scrollX != null || scrollY != null) {
			const nextScrollX = scrollX ?? camera.scrollX
			const nextScrollY = scrollY ?? camera.scrollY
			camera.setScroll(nextScrollX, nextScrollY)
		}

		this.onResizeOrCameraChange()
	}

	public zoomToPointer(newZoom: number, pointer: Phaser.Input.Pointer): void {
		const camera = this.deps.scene.cameras.main

		const pointerPosBeforeZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Change the camera zoom
		camera.zoom = newZoom

		// hack to update the camera matrix and get the new pointer position
		// @ts-expect-error Phaser camera exposes preRender at runtime
		camera.preRender()

		const pointerPosAfterZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2

		// Adjust camera position to keep the pointer in the same world position
		camera.scrollX -= pointerPosAfterZoom.x - pointerPosBeforeZoom.x
		camera.scrollY -= pointerPosAfterZoom.y - pointerPosBeforeZoom.y
	}

	public focusOnObject(objId: string): void {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const camera = this.deps.scene.cameras.main
		const bounds = obj.getBounds()

		const targetX = bounds.centerX
		const targetY = bounds.centerY

		let targetZoom = camera.zoom
		if (bounds.width > 0 && bounds.height > 0) {
			const padding = 0.2 // 20% padding
			const availableWidth = camera.width * (1 - padding)
			const availableHeight = camera.height * (1 - padding)
			targetZoom = Math.min(availableWidth / bounds.width, availableHeight / bounds.height)
			targetZoom = Math.min(targetZoom, 2) // Don't zoom in too much
		}

		this.deps.scene.tweens.add({
			targets: camera,
			zoom: targetZoom,
			scrollX: targetX - camera.width / 2,
			scrollY: targetY - camera.height / 2,
			duration: 100,
			ease: Phaser.Math.Easing.Cubic.Out,
			onUpdate: () => {
				this.onResizeOrCameraChange()
			},
		})
	}

	public alignToContextFrame(): void {
		const camera = this.deps.scene.cameras.main
		const contextFrame = (this.deps as Partial<MainSceneDeps>).contextFrame
		if (!contextFrame) {
			this.deps.logger.warn('alignToContextFrame: contextFrame is not ready yet')
			return
		}

		const contextSize = contextFrame.aabbSize

		// center camera to (0, 0)
		camera.scrollX = -camera.width / 2
		camera.scrollY = -camera.height / 2

		const zoomPaddingX = camera.width * 0.1
		const zoomPaddingY = camera.height * 0.1

		const currentZoom = camera.zoom
		let newZoom = Math.min(camera.width / (contextSize.width + zoomPaddingX), camera.height / (contextSize.height + zoomPaddingY))

		if (Phaser.Math.Fuzzy.Equal(newZoom, currentZoom)) {
			newZoom /= 2
		}

		camera.zoom = newZoom

		this.onResizeOrCameraChange()
	}

	public onResizeOrCameraChange(gameSize?: Phaser.Structs.Size): void {
		gameSize ??= this.deps.scene.scale.gameSize

		const camera = this.deps.scene.cameras.main
		this.deps.grid.redraw(gameSize, camera, camera.scrollX, camera.scrollY)
		this.deps.rulers.redraw(gameSize, camera.zoom, camera.scrollX, camera.scrollY)

		state.canvas.camera.zoom = camera.zoom
		state.canvas.camera.scrollX = camera.scrollX
		state.canvas.camera.scrollY = camera.scrollY
	}
}
