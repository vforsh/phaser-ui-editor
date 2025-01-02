import { ReadonlyDeep } from 'type-fest'
import { CssCursor } from '../../../../../../utils/CssCursor'
import { signalFromEvent } from '../../../robowhale/utils/events/create-abort-signal-from-event'
import { Selection } from './Selection'

export interface TransformControlOptions {
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
}

/**
 * Controls that allows to adjust scale, angle and origin of a transformable object.
 */
export class TransformControls extends Phaser.GameObjects.Container {
	private readonly options: ReadonlyDeep<TransformControlOptions>

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

	// selection that this transform controls follows
	private targetSelection: Selection | null = null

	constructor(scene: Phaser.Scene, options: TransformControlOptions) {
		super(scene)

		this.options = options

		const destroySignal = signalFromEvent(this, Phaser.GameObjects.Events.DESTROY)

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
			border.setTint(this.options.resizeBorders.color)
			border.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => border.setTint(0xcee9fd), this, destroySignal)
			border.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => border.setTint(this.options.resizeBorders.color), this, destroySignal)
			border.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onBorderPointerDown, this, destroySignal)
		})

		// Add the ROTATE knobs
		this.createRotateKnobTexture(this.rotateKnobTexture)
		this.addTopLeftRotateKnob()
		this.addTopRightRotateKnob()
		this.addBottomLeftRotateKnob()
		this.addBottomRightRotateKnob()

		// Setup the rotate knobs interactivity
		const rotateKnobs = [this.topLeftRotateKnob, this.topRightRotateKnob, this.bottomLeftRotateKnob, this.bottomRightRotateKnob]
		rotateKnobs.forEach((knob) => {
			knob.alpha = 0.001
			knob.setInteractive()
			this.setKnobCircleHitArea(knob.input!, this.options.rotateKnobs.radius)
			knob.input!.cursor = 'grab' satisfies CssCursor
			// knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => knob.setAlpha(0.1), this, destroySignal)
			// knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => knob.setAlpha(0.001), this, destroySignal)
			knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onRotateKnobPointerDown, this, destroySignal)
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
			knob.input!.cursor = knob === this.topLeftKnob || knob === this.bottomRightKnob ? 'nwse-resize' : 'nesw-resize'
			knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => knob.setTintFill(0xcee9fd), this, destroySignal)
			knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => knob.setTintFill(this.options.resizeKnobs.fillColor), this, destroySignal)
			knob.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onResizeKnobPointerDown, this, destroySignal)
			knob.setScale(1 / this.options.resizeKnobs.resolution)
			knob.setTintFill(this.options.resizeKnobs.fillColor)
		})

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this, destroySignal)
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

	private onRotateKnobPointerDown(pointer: Phaser.Input.Pointer, x: number, y: number) {
		console.log('ROTATE KNOB CLICK', pointer, x, y)
	}

	private onResizeKnobPointerDown(pointer: Phaser.Input.Pointer, x: number, y: number) {
		console.log('RESIZE KNOB CLICK', pointer, x, y)
	}

	private addTopBorder() {
		this.topBorder = this.scene.add.image(0, 0, '__WHITE')
		this.topBorder.name = 'top-border'
		this.topBorder.displayHeight = this.options.resizeBorders.thickness
		this.topBorder.setOrigin(0, 0.5)
		this.topBorder.setInteractive()
		Phaser.Geom.Rectangle.Inflate(this.topBorder.input!.hitArea, 0, this.options.resizeBorders.hitAreaPadding)
		this.topBorder.input!.cursor = 'ns-resize' satisfies CssCursor
		this.innerContainer.add(this.topBorder)
	}

	private addBottomBorder() {
		this.bottomBorder = this.scene.add.image(0, 0, '__WHITE')
		this.bottomBorder.name = 'bottom-border'
		this.bottomBorder.displayHeight = this.options.resizeBorders.thickness
		this.bottomBorder.setOrigin(0, 0.5)
		this.bottomBorder.setInteractive()
		Phaser.Geom.Rectangle.Inflate(this.bottomBorder.input!.hitArea, 0, this.options.resizeBorders.hitAreaPadding)
		this.bottomBorder.input!.cursor = 'ns-resize' satisfies CssCursor
		this.innerContainer.add(this.bottomBorder)
	}

	private addLeftBorder() {
		this.leftBorder = this.scene.add.image(0, 0, '__WHITE')
		this.leftBorder.name = 'left-border'
		this.leftBorder.displayWidth = this.options.resizeBorders.thickness
		this.leftBorder.setOrigin(0.5, 0)
		this.leftBorder.setInteractive()
		Phaser.Geom.Rectangle.Inflate(this.leftBorder.input!.hitArea, this.options.resizeBorders.hitAreaPadding, 0)
		this.leftBorder.input!.cursor = 'ew-resize' satisfies CssCursor
		this.innerContainer.add(this.leftBorder)
	}

	private addRightBorder() {
		this.rightBorder = this.scene.add.image(0, 0, '__WHITE')
		this.rightBorder.name = 'right-border'
		this.rightBorder.displayWidth = this.options.resizeBorders.thickness
		this.rightBorder.setOrigin(0.5, 0)
		this.rightBorder.setInteractive()
		Phaser.Geom.Rectangle.Inflate(this.rightBorder.input!.hitArea, this.options.resizeBorders.hitAreaPadding, 0)
		this.rightBorder.input!.cursor = 'ew-resize' satisfies CssCursor
		this.innerContainer.add(this.rightBorder)
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
		graphics.fillRect(0, 0, this.options.resizeKnobs.fillSize * resolution, this.options.resizeKnobs.fillSize * resolution)

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
		if (selection.size === 1) {
			const first = selection.at(0)!
			const offsetX = -first.displayWidth * first.originX
			const offsetY = -first.displayHeight * first.originY
			this.innerContainer.setPosition(offsetX, offsetY)
			return
		}

		const { left, right, top, bottom } = selection.bounds
		const width = right - left
		const height = bottom - top
		const centerX = width / 2
		const centerY = height / 2
		this.innerContainer.setPosition(-centerX, -centerY)
	}

	private adjustToSelectionAngle(selection: Selection): void {
		if (selection.size === 1) {
			this.setAngle(selection.at(0)!.angle)
			return
		}

		this.setAngle(0)
	}

	private adjustToSelectionPosition(selection: Selection): void {
		if (selection.size === 1) {
			this.setPosition(selection.at(0)!.x, selection.at(0)!.y)
			return
		}

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
}
