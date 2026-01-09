import { state } from '@state/State'

import { MainSceneDeps } from './mainSceneTypes'

export type CameraParams = {
	zoom?: number
	scrollX?: number
	scrollY?: number
}

type FocusTarget =
	| { getBounds(): Phaser.Geom.Rectangle }
	| { bounds: Phaser.Geom.Rectangle; centerX: number; centerY: number; width: number; height: number }

export type FocusOnOptions = {
	zoom?: number
	paddingPct?: number
	animate?: boolean
	durationMs?: number
	maxZoom?: number
	minZoom?: number
	avoidNoopZoom?: boolean
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

	/**
	 * Focuses the camera on the provided target bounds with optional zoom and padding.
	 *
	 * Note: context-frame focus uses a custom path in {@link focusOnContextFrame} because
	 * `EditContextFrame.getBounds()` can return zero-size bounds.
	 */
	public focusOn(target: FocusTarget, options: FocusOnOptions = {}): void {
		const camera = this.deps.scene.cameras.main
		const bounds = this.getBoundsFromTarget(target)
		if (!bounds) {
			this.deps.logger.warn('focusOn: target has invalid bounds')
			return
		}

		const paddingPct = this.normalizePadding(options.paddingPct)
		const targetZoom = this.resolveTargetZoom(camera, bounds, paddingPct, options)
		const targetScrollX = bounds.centerX - camera.width / 2
		const targetScrollY = bounds.centerY - camera.height / 2

		if (options.animate) {
			this.deps.scene.tweens.add({
				targets: camera,
				zoom: targetZoom,
				scrollX: targetScrollX,
				scrollY: targetScrollY,
				duration: options.durationMs ?? 100,
				ease: Phaser.Math.Easing.Cubic.Out,
				onUpdate: () => {
					this.onResizeOrCameraChange()
				},
			})
			return
		}

		camera.zoom = targetZoom
		camera.scrollX = targetScrollX
		camera.scrollY = targetScrollY
		this.onResizeOrCameraChange()
	}

	public focusOnContextFrame(options: FocusOnOptions = {}): void {
		const contextFrame = (this.deps as Partial<MainSceneDeps>).contextFrame
		if (!contextFrame) {
			this.deps.logger.warn('focusOnContextFrame: contextFrame is not ready yet')
			return
		}

		const camera = this.deps.scene.cameras.main
		const { width, height } = contextFrame.aabbSize
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			this.deps.logger.warn('focusOnContextFrame: contextFrame size invalid')
			return
		}

		const pos = contextFrame.getWorldPosition()
		const bounds = new Phaser.Geom.Rectangle(pos.x - width / 2, pos.y - height / 2, width, height)

		const paddingPct = this.normalizePadding(options.paddingPct)
		let targetZoom = options.zoom
		if (targetZoom == null) {
			const fitZoom = this.computeFitZoom(camera, bounds, paddingPct)
			if (fitZoom != null) {
				targetZoom = this.avoidNoopZoom(fitZoom, camera.zoom)
			}
		}

		this.focusOn(contextFrame, { ...options, zoom: targetZoom, paddingPct, avoidNoopZoom: true })
	}

	public focusOnObjectById(params: { id: string; zoom?: number; paddingPct?: number }): void {
		const obj = this.deps.objectsFactory.getObjectById(params.id)
		if (!obj) {
			this.deps.logger.warn(`focusOnObjectById: object not found (${params.id})`)
			return
		}

		this.focusOn(obj, {
			zoom: params.zoom,
			paddingPct: params.paddingPct,
			animate: true,
			durationMs: 100,
			maxZoom: 2,
			avoidNoopZoom: true,
		})
	}

	public focusOnSelectionOrContextFrame(): void {
		const selection = this.deps.editContexts.current?.selection
		if (!selection || selection.isEmpty) {
			this.focusOnContextFrame()
			return
		}

		selection.updateBounds()

		if (selection.count === 1) {
			const obj = selection.objects[0]
			this.focusOn(obj, { animate: true, durationMs: 100, maxZoom: 2, avoidNoopZoom: true })
			return
		}

		this.focusOn(selection, { animate: true, durationMs: 100, maxZoom: 2, avoidNoopZoom: true })
	}

	public focusOnObject(objId: string): void {
		this.focusOnObjectById({ id: objId })
	}

	public alignToContextFrame(): void {
		this.focusOnContextFrame()
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

	private getBoundsFromTarget(target: FocusTarget): Phaser.Geom.Rectangle | null {
		if ('getBounds' in target && typeof target.getBounds === 'function') {
			const bounds = target.getBounds()
			return this.isValidBounds(bounds) ? bounds : null
		}

		if ('bounds' in target) {
			const bounds = target.bounds
			return this.isValidBounds(bounds) ? bounds : null
		}

		return null
	}

	private isValidBounds(bounds: Phaser.Geom.Rectangle | null | undefined): boolean {
		return Boolean(
			bounds &&
			Number.isFinite(bounds.width) &&
			Number.isFinite(bounds.height) &&
			Number.isFinite(bounds.centerX) &&
			Number.isFinite(bounds.centerY),
		)
	}

	private normalizePadding(paddingPct?: number): number {
		if (paddingPct == null) {
			return 0.1
		}

		if (!Number.isFinite(paddingPct)) {
			this.deps.logger.warn('focusOn: paddingPct is not finite, using default')
			return 0.1
		}

		return Phaser.Math.Clamp(paddingPct, 0, 0.9)
	}

	private resolveTargetZoom(
		camera: Phaser.Cameras.Scene2D.Camera,
		bounds: Phaser.Geom.Rectangle,
		paddingPct: number,
		options: FocusOnOptions,
	): number {
		if (options.zoom != null) {
			return options.zoom
		}

		const fitZoom = this.computeFitZoom(camera, bounds, paddingPct)
		if (fitZoom == null) {
			return camera.zoom
		}

		const clampedZoom = this.clampZoom(fitZoom, options.minZoom, options.maxZoom)
		if (options.avoidNoopZoom) {
			return this.avoidNoopZoom(clampedZoom, camera.zoom)
		}

		return clampedZoom
	}

	private computeFitZoom(camera: Phaser.Cameras.Scene2D.Camera, bounds: Phaser.Geom.Rectangle, paddingPct: number): number | null {
		if (bounds.width <= 0 || bounds.height <= 0) {
			return null
		}

		const availableWidth = camera.width * (1 - paddingPct * 2)
		const availableHeight = camera.height * (1 - paddingPct * 2)

		if (availableWidth <= 0 || availableHeight <= 0) {
			return null
		}

		return Math.min(availableWidth / bounds.width, availableHeight / bounds.height)
	}

	private clampZoom(zoom: number, minZoom?: number, maxZoom?: number): number {
		let nextZoom = zoom
		if (minZoom != null) {
			nextZoom = Math.max(minZoom, nextZoom)
		}
		if (maxZoom != null) {
			nextZoom = Math.min(maxZoom, nextZoom)
		}
		return nextZoom
	}

	private avoidNoopZoom(nextZoom: number, currentZoom: number): number {
		if (Phaser.Math.Fuzzy.Equal(nextZoom, currentZoom)) {
			return currentZoom / 2
		}

		return nextZoom
	}
}
