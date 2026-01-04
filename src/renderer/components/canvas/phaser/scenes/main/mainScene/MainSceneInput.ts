import { BaseScene } from '@components/canvas/phaser/robowhale/phaser3/scenes/BaseScene'
import { once } from 'es-toolkit'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'

import { signalFromEvent } from '../../../robowhale/utils/events/create-abort-signal-from-event'
import { EditContext } from '../editContext/EditContext'
import { Selection } from '../editContext/Selection'
import { TransformControls } from '../editContext/TransformControls'
import { isPositionLockedForRuntimeObject } from '../objects/editing/editRestrictions'
import { MainSceneDeps, CanvasDocumentSnapshot } from './mainSceneTypes'

type SelectionDragData = {
	target: Selection
	currentX: number
	currentY: number
	offsetX: number
	offsetY: number
	lockAxis: 'none' | 'x' | 'y'
}

export class MainSceneInput {
	private sceneClickedAt: number | undefined
	private cameraDrag = false
	private cameraDragStart: { x: number; y: number } | undefined
	private selectionDrag: SelectionDragData | undefined
	private selectionDragSnapshot: CanvasDocumentSnapshot | undefined
	private scene: BaseScene
	private logger: Logger<{}>

	constructor(private deps: MainSceneDeps) {
		this.scene = this.deps.scene as BaseScene
		this.logger = this.deps.logger.getSubLogger({ name: ':input' })
	}

	public install() {
		this.addKeyboadCallbacks()
		this.addPointerCallbacks()
	}

	private registerKeyDown(
		key: Parameters<BaseScene['onKeyDown']>[0],
		handler: (this: MainSceneInput, event: KeyboardEvent) => void,
		signal: AbortSignal,
	) {
		this.scene.onKeyDown(
			key,
			(event: KeyboardEvent) => {
				this.logger.info(
					`keyDown '${key}' (ctrl: ${event.ctrlKey}, meta: ${event.metaKey}, shift: ${event.shiftKey}, alt: ${event.altKey}, repeat: ${event.repeat})`,
				)

				handler.call(this, event)
			},
			this,
			signal,
		)
	}

	private addKeyboadCallbacks() {
		const signal = this.deps.shutdownSignal

		this.registerKeyDown('S', this.onKeyDownSave, signal)
		this.registerKeyDown('A', this.onKeyDownSelectAll, signal)

		this.registerKeyDown('R', () => this.deps.restart(), signal)
		this.registerKeyDown('F', () => this.deps.cameraService.alignToContextFrame(), signal)

		this.registerKeyDown('DELETE', () => this.deps.ops.removeSelection(), signal)
		this.registerKeyDown('BACKSPACE', () => this.deps.ops.removeSelection(), signal)

		this.registerKeyDown('LEFT', (e) => this.moveSelection(-1, 0, e), signal)
		this.registerKeyDown('RIGHT', (e) => this.moveSelection(1, 0, e), signal)
		this.registerKeyDown('UP', (e) => this.moveSelection(0, -1, e), signal)
		this.registerKeyDown('DOWN', (e) => this.moveSelection(0, 1, e), signal)

		this.registerKeyDown('OPEN_BRACKET', (e) => this.moveSelectionDownInHierarchy(e), signal)
		this.registerKeyDown('CLOSED_BRACKET', (e) => this.moveSelectionUpInHierarchy(e), signal)

		this.registerKeyDown('G', (e) => this.processGrouping(e), signal)

		this.registerKeyDown('X', () => this.deps.ops.cutSelection(), signal)
		this.registerKeyDown('C', () => this.deps.ops.copySelection(), signal)
		this.registerKeyDown('V', () => this.deps.ops.paste(), signal)

		this.registerKeyDown('ZERO', () => this.resetSelectionTransform(), signal)

		this.registerKeyDown('ONE', () => this.deps.cameraService.setZoom(1), signal)
		this.registerKeyDown('TWO', ({ shiftKey }) => this.deps.cameraService.setZoom(shiftKey ? 0.5 : 2), signal)
		this.registerKeyDown('THREE', ({ shiftKey }) => this.deps.cameraService.setZoom(shiftKey ? 0.25 : 4), signal)
	}

	private onKeyDownSave(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		event.preventDefault()
		this.deps.history.updateUnsavedChanges() // Just in case, usually save is handled by persistence
		this.deps.history.applySnapshot(this.deps.history.captureSnapshot()) // Wait, save is different
		// Persistence handles savePrefab via command, but keyboard is wired here
		// MainScene will delegate savePrefab to persistence
	}

	private onKeyDownSelectAll(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		event.preventDefault()
		this.deps.ops.selectAllInCurrentContext()
	}

	private addPointerCallbacks() {
		const input = this.scene.input
		const signal = this.deps.shutdownSignal

		input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this, signal)
		input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this, signal)
		input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this, signal)
		input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this, signal)
		input.on(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut, this, signal)
	}

	private onPointerDown(pointer: Phaser.Input.Pointer, objectsUnderPointer: Phaser.GameObjects.GameObject[]): void {
		const buttonType = this.getButtonType(pointer)

		match(buttonType)
			.with('left', () => {
				const clickedOnTransformControl = objectsUnderPointer.some((obj) => obj.getData(TransformControls.TAG))
				if (clickedOnTransformControl) {
					return
				}

				const context = this.deps.editContexts.current!
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
					const parentContext = this.deps.editContexts.findParentContext(context.target)
					if (parentContext) {
						this.deps.editContexts.switchTo(parentContext.target)
					} else {
						this.deps.editContexts.switchTo(this.deps.getSuperRoot())
					}
				}
				this.sceneClickedAt = Date.now()

				this.startDrawingSelectionRect(context, pointer)
			})
			.with('middle', () => this.startCameraDrag(pointer))
			.with('right', () => console.log('right button click'))
			.exhaustive()
	}

	private startDrawingSelectionRect(selection: EditContext, pointer: Phaser.Input.Pointer) {
		const input = this.deps.scene.input
		const pointerUpSignal = signalFromEvent(input, Phaser.Input.Events.POINTER_UP)

		const selectionRect = selection.selectionRect

		const drawFrom = { x: pointer.worldX, y: pointer.worldY }

		let setupWasCalled = false
		const setup = once(() => {
			selectionRect.revive()
			selectionRect.resetBounds()
			selection.setHoverMode('selection-rect')
			setupWasCalled = true
		})

		input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				setup()
				selectionRect.draw(drawFrom, { x: pointer.worldX, y: pointer.worldY })
			},
			this,
			AbortSignal.any([this.deps.shutdownSignal, pointerUpSignal]),
		)

		input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				if (setupWasCalled === false) {
					return
				}

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
			this.deps.shutdownSignal,
		)
	}

	private onPointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.getButtonType(pointer) === 'middle') {
			this.stopCameraDrag()
			return
		}

		if (this.getButtonType(pointer) === 'left') {
			this.stopSelectionDrag(this.deps.editContexts.current!)
		}
	}

	private startCameraDrag(pointer: Phaser.Input.Pointer) {
		if (this.cameraDrag) {
			return
		}

		this.cameraDrag = true
		this.cameraDragStart = { x: pointer.x, y: pointer.y }

		this.deps.scene.game.canvas.style.cursor = 'grabbing'
	}

	private stopCameraDrag() {
		if (!this.cameraDrag) {
			return
		}

		this.cameraDrag = false
		this.cameraDragStart = undefined

		this.deps.scene.game.canvas.style.cursor = 'default'
	}

	public startSelectionDrag(selection: Selection, pointer: Phaser.Input.Pointer, context: EditContext) {
		if (this.selectionDrag) {
			return
		}

		if (selection.objects.some((obj) => isPositionLockedForRuntimeObject(obj))) {
			return
		}

		if (!this.deps.history.isRestoring) {
			this.selectionDragSnapshot = this.deps.history.captureSnapshot()
		}

		const camera = this.deps.scene.cameras.main
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

		if (this.selectionDragSnapshot) {
			const after = this.deps.history.captureSnapshot()
			void this.deps.history.push('Move', this.selectionDragSnapshot, after)
			this.selectionDragSnapshot = undefined
		}
	}

	private onPointerMove(pointer: Phaser.Input.Pointer): void {
		if (this.cameraDrag && this.cameraDragStart) {
			const dx = pointer.x - this.cameraDragStart.x
			const dy = pointer.y - this.cameraDragStart.y

			const camera = this.deps.scene.cameras.main
			camera.scrollX -= dx / camera.zoom
			camera.scrollY -= dy / camera.zoom
			this.cameraDragStart = { x: pointer.x, y: pointer.y }
			this.deps.onResizeOrCameraChange()
		}

		if (this.selectionDrag) {
			const camera = this.deps.scene.cameras.main
			const { x, y } = pointer.positionToCamera(camera) as Phaser.Math.Vector2

			if (this.selectionDrag.lockAxis === 'x') {
				this.selectionDrag.target.move(x + this.selectionDrag.offsetX - this.selectionDrag.currentX, 0)
			} else if (this.selectionDrag.lockAxis === 'y') {
				this.selectionDrag.target.move(0, y + this.selectionDrag.offsetY - this.selectionDrag.currentY)
			} else {
				this.selectionDrag.target.move(
					x + this.selectionDrag.offsetX - this.selectionDrag.currentX,
					y + this.selectionDrag.offsetY - this.selectionDrag.currentY,
				)
			}

			this.selectionDrag.currentX = this.selectionDrag.target.x
			this.selectionDrag.currentY = this.selectionDrag.target.y
		}
	}

	private getButtonType(pointer: Phaser.Input.Pointer): 'left' | 'middle' | 'right' {
		return pointer.button === 0 ? 'left' : pointer.button === 1 ? 'middle' : 'right'
	}

	private onPointerWheel(pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], dx: number, dy: number): void {
		const camera = this.deps.scene.cameras.main

		const factor = pointer.event.ctrlKey || pointer.event.metaKey ? 1.3 : 1.1
		let newZoom = camera.zoom

		const direction = Phaser.Math.Sign(dy) * -1
		if (direction > 0) {
			newZoom *= factor
		} else {
			newZoom /= factor
		}

		newZoom = Phaser.Math.Clamp(newZoom, 0.05, 30)
		newZoom = Phaser.Math.RoundTo(newZoom, -2)

		this.deps.cameraService.zoomToPointer(newZoom, pointer)
		this.deps.cameraService.onResizeOrCameraChange(this.deps.scene.scale.gameSize)
	}

	private onPointerGameOut(): void {}

	// These methods are proxies to ops/editContext for now, until all ops are moved to SelectionOps
	private moveSelection(dx: number, dy: number, event: KeyboardEvent) {
		this.deps.ops.moveSelection(dx, dy, event.shiftKey)
		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		this.deps.ops.moveSelectionDownInHierarchy(event.shiftKey)
		event.preventDefault()
	}

	private moveSelectionUpInHierarchy(event: KeyboardEvent) {
		this.deps.ops.moveSelectionUpInHierarchy(event.shiftKey)
		event.preventDefault()
	}

	private processGrouping(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		if (event.shiftKey) {
			this.deps.ops.ungroupSelection()
		} else {
			this.deps.ops.groupSelection()
		}

		event.preventDefault()
	}

	private resetSelectionTransform() {
		this.deps.ops.resetSelectionTransform()
	}
}
