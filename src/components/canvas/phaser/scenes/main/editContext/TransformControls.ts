import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { ReadonlyDeep } from 'type-fest'
import { signalFromEvent } from '../../../robowhale/utils/events/create-abort-signal-from-event'
import { Selection } from './Selection'
import { canChangeOrigin, Transformable } from './Transformable'

// custom cursors
import arrowsHorizontalCursor from './cursors/arrows-horizontal.svg?raw'
import arrowsLeftDownCursor from './cursors/arrows-left-down.svg?raw'

type Events = {
	'start-follow': (selection: Selection) => void
	'stop-follow': (selectionContent: string) => void
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
		resolution: number
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
	private target: Selection | null = null

	private __events: TypedEventEmitter<Events> = new TypedEventEmitter()

	constructor(scene: Phaser.Scene, options: TransformControlOptions) {
		super(scene)

		this.options = options
		this.logger = options.logger

		this.destroySignal = signalFromEvent(this, Phaser.GameObjects.Events.DESTROY)

		this.innerContainer = this.scene.add.container(0, 0)
		this.add(this.innerContainer)

		// Add the RESIZE borders
		this.addTopBorder()
		this.addBottomBorder()
		this.addLeftBorder()
		this.addRightBorder()

		// Setup the borders interactivity
		const borders = [this.topBorder, this.bottomBorder, this.leftBorder, this.rightBorder]
		borders.forEach((border) => {
			border.setTint(this.options.resizeBorders.color)

			const isHorizontal = border === this.topBorder || border === this.bottomBorder
			const hitAreaPadding = isHorizontal
				? { x: 0, y: this.options.resizeBorders.hitAreaPadding }
				: { x: this.options.resizeBorders.hitAreaPadding, y: 0 }
			border.setInteractive()
			Phaser.Geom.Rectangle.Inflate(border.input!.hitArea, hitAreaPadding.x, hitAreaPadding.y)

			border.on('pointerover', this.onBorderPointerOver.bind(this, border), this, this.destroySignal)
			border.on('pointerout', this.onBorderPointerOut.bind(this, border), this, this.destroySignal)
			// border.on('pointerdown', this.onBorderPointerDown.bind(this, border), this, this.destroySignal)
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
			knob.on('pointerover', this.onRotateKnobPointerOver.bind(this, knob), this, this.destroySignal)
			knob.on('pointerout', this.onRotateKnobPointerOut.bind(this, knob), this, this.destroySignal)
			knob.on('pointerdown', this.rotate.bind(this, knob), this, this.destroySignal)
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
			knob.on('pointerover', this.onResizeKnowPointerOver.bind(this, knob), this, this.destroySignal)
			knob.on('pointerout', this.onResizeKnowPointerOut.bind(this, knob), this, this.destroySignal)
			knob.on('pointerdown', this.resize.bind(this, knob), this, this.destroySignal)
			knob.setScale(1 / this.options.resizeKnobs.resolution)
			knob.setTintFill(this.options.resizeKnobs.fillColor)
		})

		this.addOriginKnob()
		const originKnob = this.originKnob
		// originKnob.setInteractive()
		// this.setKnobCircleHitArea(
		// 	originKnob.input!,
		// 	this.options.originKnob.radius + this.options.originKnob.lineThickness
		// )
		// originKnob.input!.cursor = 'move' satisfies CssCursor
		originKnob.on('pointerdown', this.changeOrigin, this, this.destroySignal)

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

	private getResizeCursor(angle: number): string {
		const rotatedSvg = arrowsHorizontalCursor.replace('<svg', `<svg style="transform: rotate(${angle}deg)"`)
		const dataUri = encodeURIComponent(rotatedSvg)
		const cursor = `url("data:image/svg+xml,${dataUri}") 12 12, pointer`

		return cursor
	}

	private getRotateCursor(angle: number): string {
		const rotatedSvg = arrowsLeftDownCursor.replace('<svg', `<svg style="transform: rotate(${angle}deg)"`)
		const dataUri = encodeURIComponent(rotatedSvg)
		const cursor = `url("data:image/svg+xml,${dataUri}") 12 12, pointer`

		return cursor
	}

	private onBorderPointerOver(border: Phaser.GameObjects.Image) {
		border.setTint(0xcee9fd)

		const isHorizontal = border === this.topBorder || border === this.bottomBorder
		const cursorAngle = this.angle + (isHorizontal ? 90 : 0)
		const cursor = this.getResizeCursor(cursorAngle)
		document.body.style.cursor = cursor
	}

	private onBorderPointerOut(border: Phaser.GameObjects.Image) {
		border.setTint(this.options.resizeBorders.color)

		document.body.style.cursor = 'default'
	}

	private onBorderPointerDown(border: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, x: number, y: number) {
		// TODO implement resize on border drag
		console.log('BORDER CLICK', pointer, x, y)
	}

	private changeOrigin(pointer: Phaser.Input.Pointer, x: number, y: number) {
		// TODO allow to move the origin knob and change the origin of the selection
		console.log('ORIGIN CLICK', pointer, x, y)
	}

	private onRotateKnobPointerOver(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer) {
		const selection = this.target
		if (!selection) {
			return
		}

		const angleOffset = this.getRotateKnowAngleOffet(knob)
		const cursorAngle = this.angle + angleOffset
		const cursor = this.getRotateCursor(cursorAngle)
		document.body.style.cursor = cursor
	}

	private onRotateKnobPointerOut(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer) {
		document.body.style.cursor = 'default'
	}

	/**
	 * As of now rotation is done separately for each object in the selection.
	 * @note Hold SHIFT to change rotation in 15 degrees increments.
	 */
	private rotate(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, x: number, y: number) {
		const selection = this.target
		if (!selection) {
			return
		}

		this.logger.debug(`rotate start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.size})`)

		const cursorAngleOffset = this.getRotateKnowAngleOffet(knob)

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

				const cursorAngle = this.angle + cursorAngleOffset
				const cursor = this.getRotateCursor(cursorAngle)
				document.body.style.cursor = cursor
			},
			this,
			AbortSignal.any([pointerUpSignal, this.destroySignal])
		)

		this.scene.input.once(
			Phaser.Input.Events.POINTER_UP,
			() => {
				this.logger.debug('rotate end')
				document.body.style.cursor = 'default'
				this.events.emit('transform-end', 'rotate')
			},
			this,
			this.destroySignal
		)
	}

	private getRotateKnowAngleOffet(knob: Phaser.GameObjects.Image): number {
		return match(knob.name)
			.with('top-right-rotate-knob', () => 0)
			.with('bottom-right-rotate-knob', () => 90)
			.with('bottom-left-rotate-knob', () => 180)
			.with('top-left-rotate-knob', () => 270)
			.run()
	}

	private onResizeKnowPointerOver(knob: Phaser.GameObjects.Image) {
		knob.setTintFill(0xcee9fd)

		const cursorAngle = knob.name.includes('left') ? 90 : 0
		const cursor = this.getResizeCursor(cursorAngle)
		document.body.style.cursor = cursor
	}

	private onResizeKnowPointerOut(knob: Phaser.GameObjects.Image) {
		knob.setTintFill(this.options.resizeKnobs.fillColor)

		document.body.style.cursor = 'default'
	}

	/**
	 * As of now resizing is done separately for each object in the selection.
	 * @note Hold SHIFT to keep the aspect ratio.
	 */
	private resize(knob: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer, x: number, y: number) {
		const selection = this.target
		if (!selection) {
			return
		}

		// it doesn't work correctly with objects that rotated by 90 and more degrees
		const knobType = match(knob.name)
			.with('top-left-resize-knob', () => 'top-left')
			.with('top-right-resize-knob', () => 'top-right')
			.with('bottom-left-resize-knob', () => 'bottom-left')
			.with('bottom-right-resize-knob', () => 'bottom-right')
			.run()

		const newOrigin = match(knobType)
			.with('top-left', () => [1, 1])
			.with('top-right', () => [0, 1])
			.with('bottom-left', () => [1, 0])
			.with('bottom-right', () => [0, 0])
			.run()

		const knobIsLeft = knobType.includes('left')
		const knobIsTop = knobType.includes('top')

		this.logger.debug(
			`resize '${knobType}' start [${selection.objects.map((obj) => obj.name).join(', ')}] (${selection.size})`
		)

		const pointerUpSignal = signalFromEvent(this.scene.input, Phaser.Input.Events.POINTER_UP)

		const pointerPos = { x: pointer.worldX, y: pointer.worldY }

		const selectionOrigin = { x: selection.originX, y: selection.originY }

		const selectedTransforms = new Map<
			Transformable,
			{
				width: number
				height: number
				originX: number
				originY: number
				aspectRatio: number
			}
		>()

		selection.objects.forEach((obj) => {
			const currentOrigin = [obj.originX, obj.originY]

			if (canChangeOrigin(obj)) {
				const offsetX = obj.displayWidth * (newOrigin[0] - currentOrigin[0])
				const offsetY = obj.displayHeight * (newOrigin[1] - currentOrigin[1])
				const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
				obj.setOrigin(newOrigin[0], newOrigin[1])
				obj.x += offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad)
				obj.y += offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad)
			}

			// TODO move to EditableContainer
			if (obj instanceof Phaser.GameObjects.Container) {
				// manually set container origin by moving its children
				const childOffsetX = -obj.displayWidth * (newOrigin[0] - 0.5)
				const childOffsetY = -obj.displayHeight * (newOrigin[1] - 0.5)
				obj.list.forEach((child) => {
					if ('setPosition' in child && typeof child.setPosition === 'function') {
						// @ts-expect-error
						child.setData('originalPosition', { x: child.x, y: child.y })
						// @ts-expect-error
						child.setPosition(child.x + childOffsetX / obj.scaleX, child.y + childOffsetY / obj.scaleY)
					}
				})

				// account for container angle
				const offsetX = obj.displayWidth * (newOrigin[0] - 0.5)
				const offsetY = obj.displayHeight * (newOrigin[1] - 0.5)
				const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
				obj.x += offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad)
				obj.y += offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad)

				obj.setData('originX', newOrigin[0])
				obj.setData('originY', newOrigin[1])
			}

			selectedTransforms.set(obj, {
				width: obj.displayWidth,
				height: obj.displayHeight,
				originX: currentOrigin[0],
				originY: currentOrigin[1],
				aspectRatio: obj.displayWidth / obj.displayHeight,
			})
		})

		selection.setOrigin(newOrigin[0], newOrigin[1])

		selection.updateBounds()

		this.events.emit('transform-start', 'resize')

		this.scene.input.on(
			Phaser.Input.Events.POINTER_MOVE,
			(pointer: Phaser.Input.Pointer) => {
				const kx = knobIsLeft ? -1 : 1
				const dx = (pointer.worldX - pointerPos.x) * kx
				const ky = knobIsTop ? -1 : 1
				const dy = (pointer.worldY - pointerPos.y) * ky

				// resize selected objects separately
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
					if (canChangeOrigin(obj)) {
						const originalOriginX = transform.originX
						const originalOriginY = transform.originY
						const offsetX = obj.displayWidth * (originalOriginX - obj.originX)
						const offsetY = obj.displayHeight * (originalOriginY - obj.originY)
						const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
						obj.setOrigin(originalOriginX, originalOriginY)
						obj.x += offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad)
						obj.y += offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad)
					}

					// TODO move to EditableContainer
					if (obj instanceof Phaser.GameObjects.Container) {
						// manually restore container origin by moving children back to their original positions
						obj.list.forEach((child) => {
							const originalPosition = child.getData('originalPosition')
							// @ts-expect-error
							child.setPosition(originalPosition.x, originalPosition.y)
						})

						const originalOriginX = 0.5
						const originalOriginY = 0.5
						const offsetX = obj.displayWidth * (originalOriginX - obj.getData('originX'))
						const offsetY = obj.displayHeight * (originalOriginY - obj.getData('originY'))
						const angleRad = obj.angle * Phaser.Math.DEG_TO_RAD
						obj.x += offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad)
						obj.y += offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad)

						obj.setData('originX', originalOriginX)
						obj.setData('originY', originalOriginY)
					}
				})

				selection.setOrigin(selectionOrigin.x, selectionOrigin.y)

				selection.updateBounds()

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
		this.originKnob.setScale(1 / this.options.originKnob.resolution)
		this.innerContainer.add(this.originKnob)
	}

	private createOriginKnobTexture(textureKey: string) {
		const resolution = this.options.originKnob.resolution
		let { radius, lineThickness, lineColor } = this.options.originKnob
		radius *= resolution
		lineThickness *= resolution

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
		if (this.target === selection) {
			return
		}

		this.adjustToSelection(selection)

		this.target = selection
		this.target.once('destroyed', this.stopFollow, this)

		this.revive()

		this.events.emit('start-follow', selection)
	}

	public stopFollow() {
		if (!this.target) {
			return
		}

		const selectionContent = this.target.objectsAsString
		this.target = null

		this.kill()

		this.events.emit('stop-follow', selectionContent)
	}

	private adjustToSelection(selection: Selection): void {
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
		const { originX, originY, width, height } = selection
		const offsetX = -width * originX
		const offsetY = -height * originY
		this.innerContainer.setPosition(offsetX, offsetY)
		this.originKnob.setPosition(width * originX, height * originY)
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
		this.setPosition(selection.x, selection.y)
	}

	private onUpdate(time: number, deltaMs: number): void {
		if (!this.target) {
			return
		}

		this.adjustToSelection(this.target)
	}

	public destroy(): void {
		super.destroy()

		this.__events.destroy()
	}

	public get events(): TypedEventEmitter<Events> {
		return this.__events
	}
}
