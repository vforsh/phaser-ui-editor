import type { ILogObj, Logger } from 'tslog'
import { signalFromEvent } from '../../../../robowhale/utils/events/create-abort-signal-from-event'
import type { EditableObject } from '../../objects/EditableObject'
import { trySetPositionUser } from '../../objects/editing/editRestrictions'
import type { Selection } from '../Selection'
import { getSelectionFrame, type SelectionFrame } from '../selection-frame'
import { canChangeOrigin } from '../Transformable'
import type { BorderHandles, CornerHandles, TransformControlHandles } from './factories'
import { setCircleHitArea, setRectHitArea } from './factories'
import {
	CursorManager,
	MIN_DISPLAY_SIZE,
	getOriginForResizeDirection,
	getResizeCursorAngleOffsetByName,
	getResizeDirectionFromRotatedDelta,
	getRotateCursorAngleOffsetByName,
	type ReadonlyTransformControlOptions,
	type ResizeDirection,
} from './types-math-cursor'

export class RotateInteraction {
	/**
	 * Install rotate interaction handlers on rotate knobs.
	 */
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly logger: Logger<ILogObj>,
		private readonly cursorManager: CursorManager,
		private readonly options: ReadonlyTransformControlOptions,
		private readonly rotateKnobs: CornerHandles,
		private readonly getSelection: () => Selection | null,
		private readonly getControlsAngle: () => number,
		private readonly events: Phaser.Events.EventEmitter,
		private readonly destroySignal: AbortSignal
	) {
		this.install()
	}

	private install(): void {
		const knobs = [
			this.rotateKnobs.topLeft,
			this.rotateKnobs.topRight,
			this.rotateKnobs.bottomLeft,
			this.rotateKnobs.bottomRight,
		]

		knobs.forEach((knob) => {
			knob.alpha = 0.001
			knob.setInteractive()
			setCircleHitArea(knob.input!, this.options.rotateKnobs.radius)
			knob.on('pointerover', this.onRotateKnobPointerOver.bind(this, knob), this, this.destroySignal)
			knob.on('pointerout', this.onRotateKnobPointerOut.bind(this), this, this.destroySignal)
			knob.on('pointerdown', this.rotate.bind(this, knob), this, this.destroySignal)
		})
	}

	private onRotateKnobPointerOver(knob: Phaser.GameObjects.Image) {
		const selection = this.getSelection()
		if (!selection) {
			return
		}

		const cursorAngleOffset = getRotateCursorAngleOffsetByName(knob.name)
		const cursorAngle = this.getControlsAngle() + cursorAngleOffset
		this.cursorManager.setRotateCursor(cursorAngle)
	}

	private onRotateKnobPointerOut() {
		this.cursorManager.setDefaultCursor()
	}

	/**
	 * As of now rotation is done separately for each object in the selection.
	 * @note Hold SHIFT to change rotation in 15 degrees increments.
	 */
	private rotate(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, _x: number, _y: number) {
		const selection = this.getSelection()
		if (!selection) {
			return
		}

		this.events.emit('transform-start', 'rotate')

		this.logger.debug(`rotate start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.count})`)

		const cursorAngleOffset = getRotateCursorAngleOffsetByName(knob.name)

		const pointerUpSignal = signalFromEvent(this.scene.input, Phaser.Input.Events.POINTER_UP)

		const pointerInitialPos = { x: pointer.worldX, y: pointer.worldY }

		const selectionInitialPos = { x: selection.x, y: selection.y }

		const pointerAngleRad = Math.atan2(
			selectionInitialPos.y - pointerInitialPos.y,
			selectionInitialPos.x - pointerInitialPos.x
		)

		const selectedTransforms = new Map<EditableObject, { angleDeg: number }>(
			selection.objects.map((obj) => [obj, { angleDeg: obj.angle }])
		)

		this.scene.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				const dx = selectionInitialPos.x - pointer.worldX
				const dy = selectionInitialPos.y - pointer.worldY
				const angleRad = Math.atan2(dy, dx)

				selectedTransforms.forEach((transform, obj) => {
					let newAngle = transform.angleDeg + (angleRad - pointerAngleRad) * Phaser.Math.RAD_TO_DEG

					if (pointer.event.shiftKey) {
						newAngle = Phaser.Math.Snap.To(newAngle, 15)
					}

					obj.setAngle(newAngle)
				})

				selection.updateBounds()

				const cursorAngle = this.getControlsAngle() + cursorAngleOffset
				this.cursorManager.setRotateCursor(cursorAngle)
			},
			this,
			AbortSignal.any([pointerUpSignal, this.destroySignal])
		)

		this.scene.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				this.cursorManager.setDefaultCursor()
				this.logger.debug('rotate end')
				this.events.emit('transform-end', 'rotate')
			},
			this,
			this.destroySignal
		)
	}
}

export class ResizeInteraction {
	/**
	 * Install resize interaction handlers on resize knobs.
	 */
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly logger: Logger<ILogObj>,
		private readonly cursorManager: CursorManager,
		private readonly options: ReadonlyTransformControlOptions,
		private readonly resizeKnobs: CornerHandles,
		private readonly resizeBorders: BorderHandles,
		private readonly getSelection: () => Selection | null,
		private readonly getControlsAngle: () => number,
		private readonly events: Phaser.Events.EventEmitter,
		private readonly destroySignal: AbortSignal
	) {
		this.install()
	}

	private install(): void {
		const knobs = [
			this.resizeKnobs.topLeft,
			this.resizeKnobs.topRight,
			this.resizeKnobs.bottomLeft,
			this.resizeKnobs.bottomRight,
		]

		knobs.forEach((knob) => {
			knob.setInteractive()
			setRectHitArea(knob.input!, this.options.resizeKnobs.fillSize * 2)
			knob.on('pointerover', this.onResizeKnobPointerOver.bind(this, knob), this, this.destroySignal)
			knob.on('pointerout', this.onResizeKnobPointerOut.bind(this, knob), this, this.destroySignal)
			knob.on('pointerdown', this.resize.bind(this, knob), this, this.destroySignal)
			knob.setScale(1 / this.options.resizeKnobs.resolution)
			knob.setTintFill(this.options.resizeKnobs.fillColor)
		})

		const borders = [
			this.resizeBorders.top,
			this.resizeBorders.bottom,
			this.resizeBorders.left,
			this.resizeBorders.right,
		]

		borders.forEach((border) => {
			border.on('pointerdown', this.resizeFromBorder.bind(this, border), this, this.destroySignal)
		})
	}

	private onResizeKnobPointerOver(knob: Phaser.GameObjects.Image) {
		knob.setTintFill(0xcee9fd)

		const cursorAngleOffset = getResizeCursorAngleOffsetByName(knob.name) + 45
		const cursorAngle = this.getControlsAngle() + cursorAngleOffset
		this.cursorManager.setResizeCursor(cursorAngle)
	}

	private onResizeKnobPointerOut(knob: Phaser.GameObjects.Image) {
		knob.setTintFill(this.options.resizeKnobs.fillColor)

		this.cursorManager.setDefaultCursor()
	}

	/**
	 * As of now resizing is done _separately_ for each object in the selection.
	 * @note Resizing is done by changing the `displayWidth` and `displayHeight` of the objects.
	 * @note Hold SHIFT to keep the aspect ratio.
	 */
	private resize(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, _x: number, _y: number) {
		const selection = this.getSelection()
		if (!selection) {
			return
		}

		const selectionCenter = { x: selection.centerX, y: selection.centerY }

		// Convert pointer world position to selection local position
		const pointerPos = selection.toLocal(pointer.worldX, pointer.worldY)

		// Calculate relative pointer position accounting for selection rotation
		const dx = pointerPos.x - selectionCenter.x
		const dy = pointerPos.y - selectionCenter.y
		const sin = Math.sin(-selection.rotation)
		const cos = Math.cos(-selection.rotation)
		const rotatedX = dx * cos - dy * sin
		const rotatedY = dx * sin + dy * cos

		// Determine resize direction based on where click happened relative to selection center
		const resizeDirection = getResizeDirectionFromRotatedDelta(rotatedX, rotatedY)

		this.performResize(selection, pointer, resizeDirection, 'both', true)
	}

	private resizeFromBorder(border: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, _x: number, _y: number) {
		const selection = this.getSelection()
		if (!selection) {
			return
		}

		const isVertical = border === this.resizeBorders.top || border === this.resizeBorders.bottom
		const resizeDirection = this.getResizeDirectionForBorder(border)
		const axis = isVertical ? 'y' : 'x'

		this.performResize(selection, pointer, resizeDirection, axis, false)
	}

	private getResizeDirectionForBorder(border: Phaser.GameObjects.Image): ResizeDirection {
		if (border === this.resizeBorders.top) {
			return 'top-left'
		}
		if (border === this.resizeBorders.bottom) {
			return 'bottom-left'
		}
		if (border === this.resizeBorders.left) {
			return 'top-left'
		}
		return 'top-right'
	}

	private performResize(
		selection: Selection,
		pointer: Phaser.Input.Pointer,
		resizeDirection: ResizeDirection,
		axis: 'both' | 'x' | 'y',
		allowAspectRatio: boolean
	) {
		this.events.emit('transform-start', 'resize')

		const sin = Math.sin(-selection.rotation)
		const cos = Math.cos(-selection.rotation)

		const newOrigin = getOriginForResizeDirection(resizeDirection)

		const knobIsLeft = resizeDirection.includes('left')
		const knobIsTop = resizeDirection.includes('top')

		this.logger.debug(
			`resize '${resizeDirection}' start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.count})`
		)

		const pointerUpSignal = signalFromEvent(this.scene.input, Phaser.Input.Events.POINTER_UP)

		const pointerPosInitial = { x: pointer.worldX, y: pointer.worldY }

		const selectionOriginInitial = { x: selection.originX, y: selection.originY }

		const selectedTransforms = new Map<
			EditableObject,
			{
				width: number
				height: number
				originX: number
				originY: number
				aspectRatio: number
				x: number
				y: number
				scaleX: number
				scaleY: number
				rotation: number
			}
		>()

		selection.objects.forEach((obj) => {
			const currentOrigin = [obj.originX, obj.originY]
			const containerDisplayWidth = Math.abs(obj.width * obj.scaleX)
			const containerDisplayHeight = Math.abs(obj.height * obj.scaleY)

			if (canChangeOrigin(obj)) {
				const offsetX = obj.displayWidth * (newOrigin[0] - currentOrigin[0])
				const offsetY = obj.displayHeight * (newOrigin[1] - currentOrigin[1])
				const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
				obj.setOrigin(newOrigin[0], newOrigin[1])

				const nextX = obj.x + (offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad))
				const nextY = obj.y + (offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad))
				trySetPositionUser(obj, nextX, nextY)
			}

			selectedTransforms.set(obj, {
				width: obj.kind === 'Container' ? containerDisplayWidth : obj.displayWidth,
				height: obj.kind === 'Container' ? containerDisplayHeight : obj.displayHeight,
				originX: currentOrigin[0],
				originY: currentOrigin[1],
				aspectRatio: (() => {
					const displayWidth = obj.kind === 'Container' ? containerDisplayWidth : obj.displayWidth
					const displayHeight = obj.kind === 'Container' ? containerDisplayHeight : obj.displayHeight
					if (displayHeight === 0 || displayWidth === 0) {
						return 1
					}
					return displayWidth / displayHeight
				})(),
				x: obj.x,
				y: obj.y,
				scaleX: obj.scaleX,
				scaleY: obj.scaleY,
				rotation: obj.rotation,
			})
		})

		selection.setOrigin(newOrigin[0], newOrigin[1])

		selection.updateBounds()

		// actually resizing is done here, on pointer move
		this.scene.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				// Calculate delta in rotated coordinate system
				const worldDx = pointer.worldX - pointerPosInitial.x
				const worldDy = pointer.worldY - pointerPosInitial.y

				// Rotate the delta to match selection's coordinate system
				const rotatedDx = worldDx * cos - worldDy * sin
				const rotatedDy = worldDx * sin + worldDy * cos

				const kx = knobIsLeft ? -1 : 1
				const ky = knobIsTop ? -1 : 1
				const deltaX = axis === 'y' ? 0 : rotatedDx * kx
				const deltaY = axis === 'x' ? 0 : rotatedDy * ky

				// resize selected objects separately
				selectedTransforms.forEach((transform, obj) => {
					const useAspectRatio = allowAspectRatio && axis === 'both' && pointer.event.shiftKey
					const adjustedDy = useAspectRatio ? deltaX / transform.aspectRatio : deltaY
					const newDisplayWidth =
						axis === 'y' ? transform.width : Math.max(transform.width + deltaX, MIN_DISPLAY_SIZE)
					const newDisplayHeight =
						axis === 'x' ? transform.height : Math.max(transform.height + adjustedDy, MIN_DISPLAY_SIZE)

					if (obj.kind === 'Container') {
						const scaleX = transform.scaleX === 0 ? 1 : Math.abs(transform.scaleX)
						const scaleY = transform.scaleY === 0 ? 1 : Math.abs(transform.scaleY)
						const unscaledWidth = newDisplayWidth / scaleX
						const unscaledHeight = newDisplayHeight / scaleY

						const signX = resizeDirection.includes('left') ? 1 : -1
						const signY = resizeDirection.includes('top') ? 1 : -1
						const offsetLocalX = (signX * (transform.width - newDisplayWidth)) / 2
						const offsetLocalY = (signY * (transform.height - newDisplayHeight)) / 2
						const sinObj = Math.sin(transform.rotation)
						const cosObj = Math.cos(transform.rotation)
						const offsetWorldX = offsetLocalX * cosObj - offsetLocalY * sinObj
						const offsetWorldY = offsetLocalX * sinObj + offsetLocalY * cosObj

						obj.setSize(unscaledWidth, unscaledHeight)
						trySetPositionUser(obj, transform.x + offsetWorldX, transform.y + offsetWorldY)
						return
					}

					obj.setDisplaySize(newDisplayWidth, newDisplayHeight)
				})

				selection.updateBounds()
			},
			this,
			AbortSignal.any([pointerUpSignal, this.destroySignal])
		)

		this.scene.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				// restore the origins
				selectedTransforms.forEach((transform, obj) => {
					if (canChangeOrigin(obj)) {
						const originalOriginX = transform.originX
						const originalOriginY = transform.originY
						const offsetX = obj.displayWidth * (originalOriginX - obj.originX)
						const offsetY = obj.displayHeight * (originalOriginY - obj.originY)
						const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
						obj.setOrigin(originalOriginX, originalOriginY)

						const nextX = obj.x + (offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad))
						const nextY = obj.y + (offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad))
						trySetPositionUser(obj, nextX, nextY)
					}
				})

				selection.setOrigin(selectionOriginInitial.x, selectionOriginInitial.y)

				selection.updateBounds()

				this.logger.debug(`resize '${resizeDirection}' end`)

				this.events.emit('transform-end', 'resize')
			},
			this,
			this.destroySignal
		)
	}
}

export class SelectionFollower {
	/**
	 * Create a selection follower that aligns handles to selection bounds.
	 */
	constructor(
		private readonly controls: Phaser.GameObjects.Container,
		private readonly handles: TransformControlHandles
	) {}

	/**
	 * Update handles to follow the current selection state.
	 */
	adjustToSelection(selection: Selection): void {
		const frame = getSelectionFrame(selection)

		this.adjustToSelectionSize(frame)
		this.adjustToSelectionOrigin(frame)
		this.adjustToSelectionAngle(selection)
		this.adjustToSelectionPosition(frame)
	}

	private adjustToSelectionSize(frame: SelectionFrame): void {
		this.resizeBorders(frame)
		this.alignResizeKnobs()
		this.alignRotateKnobs()
	}

	private resizeBorders(frame: SelectionFrame) {
		const { borders } = this.handles
		const width = frame.width
		const height = frame.height

		// top border has origin at (0, 0.5)
		// so when we increase its width, it expands to the right
		borders.top.displayWidth = width

		// bottom border has origin at (0, 0.5)
		// so when we increase its width, it expands to the right
		borders.bottom.displayWidth = width
		borders.bottom.y = height

		// left border has origin at (0.5, 0)
		// so when we increase its height, it expands to the bottom
		borders.left.displayHeight = height

		// right border has origin at (0.5, 0)
		// so when we increase its height, it expands to the bottom
		borders.right.displayHeight = height
		borders.right.x = width
	}

	// resize borders before calling this!
	private alignResizeKnobs() {
		const { borders, resizeKnobs } = this.handles

		resizeKnobs.topLeft.x = borders.top.left
		resizeKnobs.topLeft.y = borders.top.y

		resizeKnobs.topRight.x = borders.top.displayWidth
		resizeKnobs.topRight.y = borders.top.y

		resizeKnobs.bottomLeft.x = borders.left.x
		resizeKnobs.bottomLeft.y = borders.bottom.y

		resizeKnobs.bottomRight.x = borders.right.x
		resizeKnobs.bottomRight.y = borders.bottom.y
	}

	// align resize knobs before calling this!
	private alignRotateKnobs() {
		const { rotateKnobs, resizeKnobs } = this.handles

		rotateKnobs.topLeft.x = resizeKnobs.topLeft.x
		rotateKnobs.topLeft.y = resizeKnobs.topLeft.y

		rotateKnobs.topRight.x = resizeKnobs.topRight.x
		rotateKnobs.topRight.y = resizeKnobs.topRight.y

		rotateKnobs.bottomLeft.x = resizeKnobs.bottomLeft.x
		rotateKnobs.bottomLeft.y = resizeKnobs.bottomLeft.y

		rotateKnobs.bottomRight.x = resizeKnobs.bottomRight.x
		rotateKnobs.bottomRight.y = resizeKnobs.bottomRight.y
	}

	private adjustToSelectionOrigin(frame: SelectionFrame): void {
		const { innerContainer, originKnob } = this.handles
		const offsetX = -frame.width * frame.originX
		const offsetY = -frame.height * frame.originY
		innerContainer.setPosition(offsetX, offsetY)
		originKnob.setPosition(frame.width * frame.originX, frame.height * frame.originY)
	}

	private adjustToSelectionAngle(selection: Selection): void {
		if (selection.objects.length === 1) {
			const obj = selection.objects[0]
			this.controls.setAngle(obj.angle)
			return
		}

		this.controls.setAngle(selection.angle)
	}

	private adjustToSelectionPosition(frame: SelectionFrame): void {
		this.controls.setPosition(frame.positionX, frame.positionY)
	}
}
