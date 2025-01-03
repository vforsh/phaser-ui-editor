import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { ReadonlyDeep } from 'type-fest'
import { CssCursor } from '../../../../../../utils/CssCursor'
import { signalFromEvent } from '../../../robowhale/utils/events/create-abort-signal-from-event'
import { Selection } from './Selection'
import { Transformable } from './Transformable'

type Events = {
	'transform-start': (type: 'rotate' | 'resize' | 'origin') => void
	'transform-end': (type: 'rotate' | 'resize' | 'origin') => void
}

export interface TransformControlOptions {
	logger: Logger<{}>
	resizeBorders: {
		thickness: number
		color: number
		hitAreaPadding: number
	}
	resizeKnobs: {
		// width and height of the knob texture
		fillSize: number
		fillColor: number
		resolution: number
	}
	rotateKnobs: {
		radius: number
	}
	originKnob: {
		radius: number
		lineColor: number
		lineThickness: number
	}
}

/**
 * Controls that allows to adjust scale, angle and origin of a transformable object.
 */
export class TransformControls extends Phaser.GameObjects.Container {
	public static readonly TAG = 'transform-control'

	private readonly options: ReadonlyDeep<TransformControlOptions>
	private readonly logger: Logger<{}>
	private destroySignal: AbortSignal

	private innerContainer: Phaser.GameObjects.Container

	private topBorder!: Phaser.GameObjects.Image
	private bottomBorder!: Phaser.GameObjects.Image
	private leftBorder!: Phaser.GameObjects.Image
	private rightBorder!: Phaser.GameObjects.Image

	private readonly resizeKnobTexture = 'resize-knob'
	private topLeftKnob!: Phaser.GameObjects.Image
	private topRightKnob!: Phaser.GameObjects.Image
	private bottomLeftKnob!: Phaser.GameObjects.Image
	private bottomRightKnob!: Phaser.GameObjects.Image

	private readonly rotateKnobTexture = 'rotate-knob'
	private topLeftRotateKnob!: Phaser.GameObjects.Image
	private topRightRotateKnob!: Phaser.GameObjects.Image
	private bottomLeftRotateKnob!: Phaser.GameObjects.Image
	private bottomRightRotateKnob!: Phaser.GameObjects.Image

	private originKnob!: Phaser.GameObjects.Image

	// selection that this transform controls follows
	private targetSelection: Selection | null = null

	private __events: TypedEventEmitter<Events> = new TypedEventEmitter()

	constructor(scene: Phaser.Scene, options: TransformControlOptions) {
		super(scene)

		this.options = options
		this.logger = options.logger

		this.destroySignal = signalFromEvent(this, Phaser.GameObjects.Events.DESTROY)

		this.innerContainer = this.scene.add.container(0, 0)
		this.add(this.innerContainer)

		// Add the borders
		this.addTopBorder()
		this.addBottomBorder()
		this.addLeftBorder()
		this.addRightBorder()

		// Setup the borders interactivity
		const borders = [this.topBorder, this.bottomBorder, this.leftBorder, this.rightBorder]
		borders.forEach((border) => {
			// const isHorizontal = border === this.topBorder || border === this.bottomBorder
			// const hitAreaPadding = isHorizontal
			// 	? { x: 0, y: this.options.resizeBorders.hitAreaPadding }
			// 	: { x: this.options.resizeBorders.hitAreaPadding, y: 0 }
			// const cursor: CssCursor = isHorizontal ? 'ns-resize' : 'ew-resize'

			// border.setInteractive()
			// Phaser.Geom.Rectangle.Inflate(border.input!.hitArea, hitAreaPadding.x, hitAreaPadding.y)
			// border.input!.cursor = cursor

			border.setTint(this.options.resizeBorders.color)
			// border.on(
			// 	Phaser.Input.Events.GAMEOBJECT_POINTER_OVER,
			// 	() => border.setTint(0xcee9fd),
			// 	this,
			// 	this.destroySignal
			// )
			// border.on(
			// 	Phaser.Input.Events.GAMEOBJECT_POINTER_OUT,
			// 	() => border.setTint(this.options.resizeBorders.color),
			// 	this,
			// 	this.destroySignal
			// )
			// border.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onBorderPointerDown, this, this.destroySignal)
		})

		// Add the ROTATE knobs
		this.createRotateKnobTexture(this.rotateKnobTexture)
		this.addTopLeftRotateKnob()
		this.addTopRightRotateKnob()
		this.addBottomLeftRotateKnob()
		this.addBottomRightRotateKnob()

		// Setup the rotate knobs interactivity
		const rotateKnobs = [
			this.topLeftRotateKnob,
			this.topRightRotateKnob,
			this.bottomLeftRotateKnob,
			this.bottomRightRotateKnob,
		]
		rotateKnobs.forEach((knob) => {
			knob.alpha = 0.001
			knob.setInteractive()
			this.setKnobCircleHitArea(knob.input!, this.options.rotateKnobs.radius)
			knob.input!.cursor = 'grab' satisfies CssCursor
			// knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => knob.setAlpha(0.1), this, destroySignal)
			// knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => knob.setAlpha(0.001), this, destroySignal)
			knob.on(
				Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
				this.onRotateKnobPointerDown.bind(this, knob),
				this,
				this.destroySignal
			)
		})

		// Add the RESIZE knobs
		this.createResizeKnobTexture(this.resizeKnobTexture)
		this.addTopLeftKnob()
		this.addTopRightKnob()
		this.addBottomLeftKnob()
		this.addBottomRightKnob()

		// Setup the resize knobs interactivity
		const resizeKnobs = [this.topLeftKnob, this.topRightKnob, this.bottomLeftKnob, this.bottomRightKnob]
		resizeKnobs.forEach((knob) => {
			knob.setInteractive()
			this.setKnobRectHitArea(knob.input!, this.options.resizeKnobs.fillSize * 2)
			knob.input!.cursor =
				knob === this.topLeftKnob || knob === this.bottomRightKnob ? 'nwse-resize' : 'nesw-resize'
			knob.on(
				Phaser.Input.Events.GAMEOBJECT_POINTER_OVER,
				() => knob.setTintFill(0xcee9fd),
				this,
				this.destroySignal
			)
			knob.on(
				Phaser.Input.Events.GAMEOBJECT_POINTER_OUT,
				() => knob.setTintFill(this.options.resizeKnobs.fillColor),
				this,
				this.destroySignal
			)
			knob.on(
				Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
				this.onResizeKnobPointerDown.bind(this, knob),
				this,
				this.destroySignal
			)
			knob.setScale(1 / this.options.resizeKnobs.resolution)
			knob.setTintFill(this.options.resizeKnobs.fillColor)
		})

		this.addOriginKnob()
		const originKnob = this.originKnob
		originKnob.setInteractive()
		this.setKnobCircleHitArea(
			originKnob.input!,
			this.options.originKnob.radius + this.options.originKnob.lineThickness
		)
		originKnob.input!.cursor = 'move' satisfies CssCursor
		originKnob.on(
			Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
			this.onOriginKnobPointerDown,
			this,
			this.destroySignal
		)

		// prettier-ignore
		;[...borders, ...rotateKnobs, ...resizeKnobs, this.originKnob].forEach((child) => {
			child.setData(TransformControls.TAG, true)
		})

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this, this.destroySignal)
	}

	private setKnobRectHitArea(knobInput: Phaser.Types.Input.InteractiveObject, size: number) {
		knobInput.hitArea = new Phaser.Geom.Rectangle(0, 0, size, size)
		knobInput.hitAreaCallback = Phaser.Geom.Rectangle.Contains
	}

	private setKnobCircleHitArea(knobInput: Phaser.Types.Input.InteractiveObject, radius: number) {
		knobInput.hitArea = new Phaser.Geom.Circle(radius, radius, radius)
		knobInput.hitAreaCallback = Phaser.Geom.Circle.Contains
	}

	private onBorderPointerDown(pointer: Phaser.Input.Pointer, x: number, y: number) {
		console.log('BORDER CLICK', pointer, x, y)
	}

	private onOriginKnobPointerDown(pointer: Phaser.Input.Pointer, x: number, y: number) {
		console.log('ORIGIN CLICK', pointer, x, y)

		// TODO allow to move the origin knob and change the origin of the selection
	}

	private onRotateKnobPointerDown(
		knob: Phaser.GameObjects.Image,
		pointer: Phaser.Input.Pointer,
		x: number,
		y: number
	) {
		const selection = this.targetSelection
		if (!selection) {
			return
		}

		this.logger.debug(`rotate start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.size})`)

		const originalCursor = document.body.style.cursor
		document.body.style.cursor = 'grabbing' satisfies CssCursor
		knob.input!.cursor = 'grabbing' satisfies CssCursor

		const pointerUpSignal = signalFromEvent(this.scene.input, Phaser.Input.Events.POINTER_UP)

		const pointerPos = { x: pointer.worldX, y: pointer.worldY }

		const selectionCenter = {
			x: selection.bounds.left + selection.bounds.width / 2,
			y: selection.bounds.top + selection.bounds.height / 2,
		}

		const pointerAngleRad = Math.atan2(selectionCenter.y - pointerPos.y, selectionCenter.x - pointerPos.x)

		const selectedTransforms = new Map<Transformable, { angleDeg: number }>()

		selection.objects.forEach((obj) => {
			selectedTransforms.set(obj, {
				angleDeg: obj.angle,
			})
		})

		this.events.emit('transform-start', 'rotate')

		this.scene.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				const dx = selectionCenter.x - pointer.worldX
				const dy = selectionCenter.y - pointer.worldY
				const angleRad = Math.atan2(dy, dx)

				selectedTransforms.forEach((transform, obj) => {
					let newAngle = transform.angleDeg + (angleRad - pointerAngleRad) * Phaser.Math.RAD_TO_DEG

					if (pointer.event.shiftKey) {
						newAngle = Phaser.Math.Snap.To(newAngle, 15)
					}

					obj.setAngle(newAngle)
				})

				selection.updateBounds()
			},
			this,
			AbortSignal.any([pointerUpSignal, this.destroySignal])
		)

		this.scene.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				this.logger.debug('rotate end')
				document.body.style.cursor = originalCursor
				knob.input!.cursor = 'grab' satisfies CssCursor
				this.events.emit('transform-end', 'rotate')
			},
			this,
			this.destroySignal
		)
	}

	private onResizeKnobPointerDown(
		knob: Phaser.GameObjects.Image,
		pointer: Phaser.Input.Pointer,
		x: number,
		y: number
	) {
		const selection = this.targetSelection
		if (!selection) {
			return
		}

		const knobType = match(knob.name)
			.with('top-left-resize-knob', () => 'top-left')
			.with('top-right-resize-knob', () => 'top-right')
			.with('bottom-left-resize-knob', () => 'bottom-left')
			.with('bottom-right-resize-knob', () => 'bottom-right')
			.run()

		const knobIsLeft = knobType.includes('left')
		const knobIsTop = knobType.includes('top')

		this.logger.debug(
			`resize '${knobType}' start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.size})`
		)

		const pointerUpSignal = signalFromEvent(this.scene.input, Phaser.Input.Events.POINTER_UP)

		const pointerPos = { x: pointer.worldX, y: pointer.worldY }

		const selectedTransforms = new Map<
			Phaser.GameObjects.Image,
			{ width: number; height: number; originX: number; originY: number; aspectRatio: number }
		>()

		selection.objects.forEach((obj) => {
			// TODO handle non-image objects
			if (!(obj instanceof Phaser.GameObjects.Image)) {
				return
			}

			const currentOrigin = [obj.originX, obj.originY]

			const newOrigin = match(knobType)
				.with('top-left', () => [1, 1])
				.with('top-right', () => [0, 1])
				.with('bottom-left', () => [1, 0])
				.with('bottom-right', () => [0, 0])
				.run()

			const offsetX = obj.displayWidth * (newOrigin[0] - currentOrigin[0])
			const offsetY = obj.displayHeight * (newOrigin[1] - currentOrigin[1])

			obj.setOrigin(...newOrigin)
			obj.x += offsetX
			obj.y += offsetY

			selectedTransforms.set(obj, {
				width: obj.displayWidth,
				height: obj.displayHeight,
				originX: currentOrigin[0],
				originY: currentOrigin[1],
				aspectRatio: obj.displayWidth / obj.displayHeight,
			})
		})

		this.events.emit('transform-start', 'resize')

		this.scene.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				const kx = knobIsLeft ? -1 : 1
				const dx = (pointer.worldX - pointerPos.x) * kx
				const ky = knobIsTop ? -1 : 1
				const dy = (pointer.worldY - pointerPos.y) * ky

				selectedTransforms.forEach((transform, obj) => {
					// keep the aspect ratio if shift is pressed
					const _dy = pointer.event.shiftKey ? dx / transform.aspectRatio : dy

					obj.displayWidth = Math.max(transform.width + dx, 16)
					obj.displayHeight = Math.max(transform.height + _dy, 16)
				})

				selection.updateBounds()
			},
			this,
			AbortSignal.any([pointerUpSignal, this.destroySignal])
		)

		this.scene.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				// this.logger.debug('resize end')

				// restore the origins
				selectedTransforms.forEach((transform, obj) => {
					const newOriginX = transform.originX
					const newOriginY = transform.originY
					const currentOriginX = obj.originX
					const currentOriginY = obj.originY
					const offsetX = obj.displayWidth * (newOriginX - currentOriginX)
					const offsetY = obj.displayHeight * (newOriginY - currentOriginY)
					obj.setOrigin(newOriginX, newOriginY)
					obj.x += offsetX
					obj.y += offsetY
				})

				this.events.emit('transform-end', 'resize')
			},
			this,
			this.destroySignal
		)
	}

	private addTopBorder() {
		this.topBorder = this.scene.add.image(0, 0, '__WHITE')
		this.topBorder.name = 'top-border'
		this.topBorder.displayHeight = this.options.resizeBorders.thickness
		this.topBorder.setOrigin(0, 0.5)
		this.innerContainer.add(this.topBorder)
	}

	private addBottomBorder() {
		this.bottomBorder = this.scene.add.image(0, 0, '__WHITE')
		this.bottomBorder.name = 'bottom-border'
		this.bottomBorder.displayHeight = this.options.resizeBorders.thickness
		this.bottomBorder.setOrigin(0, 0.5)
		this.innerContainer.add(this.bottomBorder)
	}

	private addLeftBorder() {
		this.leftBorder = this.scene.add.image(0, 0, '__WHITE')
		this.leftBorder.name = 'left-border'
		this.leftBorder.displayWidth = this.options.resizeBorders.thickness
		this.leftBorder.setOrigin(0.5, 0)
		this.innerContainer.add(this.leftBorder)
	}

	private addRightBorder() {
		this.rightBorder = this.scene.add.image(0, 0, '__WHITE')
		this.rightBorder.name = 'right-border'
		this.rightBorder.displayWidth = this.options.resizeBorders.thickness
		this.rightBorder.setOrigin(0.5, 0)
		this.innerContainer.add(this.rightBorder)
	}

	private addOriginKnob() {
		const textureKey = this.createOriginKnobTexture('origin-knob')
		this.originKnob = this.scene.add.image(0, 0, textureKey)
		this.originKnob.name = 'origin-knob'
		this.originKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.originKnob)
	}

	private createOriginKnobTexture(textureKey: string) {
		// TODO use x2 resolution for the knob texture bc it looks blurry with the default resolution

		const { radius, lineThickness, lineColor } = this.options.originKnob
		const centerX = radius + lineThickness
		const centerY = centerX

		const graphics = this.scene.make.graphics()
		graphics.fillStyle(0xffffff, 1)
		graphics.fillCircle(centerX, centerY, radius)

		graphics.lineStyle(lineThickness, lineColor, 1)
		graphics.strokeCircle(centerX, centerY, radius)

		// draw cross in the center of the knob
		// graphics.lineStyle(lineThickness * 0.75, lineColor, 1)
		// graphics.lineBetween(centerX, centerY - radius, centerX, centerY + radius)
		// graphics.lineBetween(centerX - radius, centerY, centerX + radius, centerY)

		const width = (radius + lineThickness) * 2
		const height = width
		graphics.generateTexture(textureKey, width, height)

		graphics.destroy()

		return textureKey
	}

	private createRotateKnobTexture(textureKey: string) {
		const centerX = this.options.rotateKnobs.radius
		const centerY = centerX

		const graphics = this.scene.make.graphics()
		graphics.fillStyle(0xffffff, 1)
		graphics.fillCircle(centerX, centerY, this.options.rotateKnobs.radius)
		graphics.fillPath()

		const width = this.options.rotateKnobs.radius * 2
		const height = width
		graphics.generateTexture(textureKey, width, height)

		graphics.destroy()

		return textureKey
	}

	private addTopRightRotateKnob() {
		this.topRightRotateKnob = this.scene.add.image(0, 0, this.rotateKnobTexture)
		this.topRightRotateKnob.name = 'top-right-rotate-knob'
		this.topRightRotateKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.topRightRotateKnob)
	}

	private addTopLeftRotateKnob() {
		this.topLeftRotateKnob = this.scene.add.image(0, 0, this.rotateKnobTexture)
		this.topLeftRotateKnob.name = 'top-left-rotate-knob'
		this.topLeftRotateKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.topLeftRotateKnob)
	}

	private addBottomLeftRotateKnob() {
		this.bottomLeftRotateKnob = this.scene.add.image(0, 0, this.rotateKnobTexture)
		this.bottomLeftRotateKnob.name = 'bottom-left-rotate-knob'
		this.bottomLeftRotateKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.bottomLeftRotateKnob)
	}

	private addBottomRightRotateKnob() {
		this.bottomRightRotateKnob = this.scene.add.image(0, 0, this.rotateKnobTexture)
		this.bottomRightRotateKnob.name = 'bottom-right-rotate-knob'
		this.bottomRightRotateKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.bottomRightRotateKnob)
	}

	private createResizeKnobTexture(textureKey: string) {
		// we use higher resolution for the knob texture to make it look sharper
		const resolution = this.options.resizeKnobs.resolution

		const graphics = this.scene.make.graphics()
		graphics.fillStyle(0xffffff, 1)
		graphics.fillRect(
			0,
			0,
			this.options.resizeKnobs.fillSize * resolution,
			this.options.resizeKnobs.fillSize * resolution
		)

		const width = this.options.resizeKnobs.fillSize * resolution
		const height = width
		graphics.generateTexture(textureKey, width, height)

		graphics.destroy()

		return textureKey
	}

	private addTopLeftKnob() {
		this.topLeftKnob = this.scene.add.image(0, 0, this.resizeKnobTexture)
		this.topLeftKnob.name = 'top-left-resize-knob'
		this.topLeftKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.topLeftKnob)
	}

	private addTopRightKnob() {
		this.topRightKnob = this.scene.add.image(0, 0, this.resizeKnobTexture)
		this.topRightKnob.name = 'top-right-resize-knob'
		this.topRightKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.topRightKnob)
	}

	private addBottomLeftKnob() {
		this.bottomLeftKnob = this.scene.add.image(0, 0, this.resizeKnobTexture)
		this.bottomLeftKnob.name = 'bottom-left-resize-knob'
		this.bottomLeftKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.bottomLeftKnob)
	}

	private addBottomRightKnob() {
		this.bottomRightKnob = this.scene.add.image(0, 0, this.resizeKnobTexture)
		this.bottomRightKnob.name = 'bottom-right-resize-knob'
		this.bottomRightKnob.setOrigin(0.5, 0.5)
		this.innerContainer.add(this.bottomRightKnob)
	}

	public startFollow(selection: Selection) {
		this.adjustToSelection(selection)

		this.targetSelection = selection
		this.targetSelection.once('destroyed', this.stopFollow, this)

		this.revive()

		this.emit('start-follow', selection)
	}

	private adjustToSelection(selection: Selection): void {
		this.originKnob.visible = selection.objects.length === 1
		if (this.originKnob.visible) {
			const obj = selection.objects[0]
			const { originX, originY } = obj
			this.originKnob.setPosition(obj.displayWidth * originX, obj.displayHeight * originY)
		}

		this.adjustToSelectionSize(selection)
		this.adjustToSelectionOrigin(selection)
		this.adjustToSelectionAngle(selection)
		this.adjustToSelectionPosition(selection)
	}

	private adjustToSelectionSize(selection: Selection): void {
		this.resizeBorders(selection)
		this.alignResizeKnobs()
		this.alignRotateKnobs()
	}

	private resizeBorders(selection: Selection) {
		const { left, right, top, bottom } = selection.bounds

		const width = right - left
		const height = bottom - top

		this.topBorder.displayWidth = width

		this.bottomBorder.displayWidth = width
		this.bottomBorder.y = height

		this.leftBorder.displayHeight = height

		this.rightBorder.displayHeight = height
		this.rightBorder.x = width
	}

	// resize borders before calling this!
	private alignResizeKnobs() {
		this.topLeftKnob.x = this.topBorder.left
		this.topLeftKnob.y = this.topBorder.y

		this.topRightKnob.x = this.topBorder.displayWidth
		this.topRightKnob.y = this.topBorder.y

		this.bottomLeftKnob.x = this.leftBorder.x
		this.bottomLeftKnob.y = this.bottomBorder.y

		this.bottomRightKnob.x = this.rightBorder.x
		this.bottomRightKnob.y = this.bottomBorder.y
	}

	// align resize knobs before calling this!
	private alignRotateKnobs() {
		this.topLeftRotateKnob.x = this.topLeftKnob.x
		this.topLeftRotateKnob.y = this.topLeftKnob.y

		this.topRightRotateKnob.x = this.topRightKnob.x
		this.topRightRotateKnob.y = this.topRightKnob.y

		this.bottomLeftRotateKnob.x = this.bottomLeftKnob.x
		this.bottomLeftRotateKnob.y = this.bottomLeftKnob.y

		this.bottomRightRotateKnob.x = this.bottomRightKnob.x
		this.bottomRightRotateKnob.y = this.bottomRightKnob.y
	}

	private adjustToSelectionOrigin(selection: Selection): void {
		const { left, right, top, bottom } = selection.bounds
		const width = right - left
		const height = bottom - top
		const centerX = width / 2
		const centerY = height / 2
		this.innerContainer.setPosition(-centerX, -centerY)
	}

	private adjustToSelectionAngle(selection: Selection): void {
		if (selection.objects.length === 1) {
			const angle = selection.objects[0].angle
			this.setAngle(angle)
			return
		}

		this.setAngle(0)
	}

	private adjustToSelectionPosition(selection: Selection): void {
		const { left, right, top, bottom } = selection.bounds
		const width = right - left
		const height = bottom - top
		const centerX = width / 2
		const centerY = height / 2
		this.setPosition(left + centerX, top + centerY)
	}

	public stopFollow() {
		this.targetSelection = null
		this.kill()
	}

	private onUpdate(time: number, deltaMs: number): void {
		if (!this.targetSelection) {
			return
		}

		this.adjustToSelection(this.targetSelection)
	}

	public destroy(): void {
		super.destroy()

		this.__events.destroy()
	}

	public get events(): TypedEventEmitter<Events> {
		return this.__events
	}
}
