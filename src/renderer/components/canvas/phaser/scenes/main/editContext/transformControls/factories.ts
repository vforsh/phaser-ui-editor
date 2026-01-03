import type { ReadonlyTransformControlOptions } from './types-math-cursor'

export type BorderHandles = {
	top: Phaser.GameObjects.Image
	bottom: Phaser.GameObjects.Image
	left: Phaser.GameObjects.Image
	right: Phaser.GameObjects.Image
}

export type CornerHandles = {
	topLeft: Phaser.GameObjects.Image
	topRight: Phaser.GameObjects.Image
	bottomLeft: Phaser.GameObjects.Image
	bottomRight: Phaser.GameObjects.Image
}

export type TransformControlHandles = {
	innerContainer: Phaser.GameObjects.Container
	borders: BorderHandles
	resizeKnobs: CornerHandles
	rotateKnobs: CornerHandles
	originKnob: Phaser.GameObjects.Image
	all: Phaser.GameObjects.Image[]
}

export type TextureKeys = {
	resizeKnob: string
	rotateKnob: string
	originKnob: string
}

export class TextureFactory {
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly options: ReadonlyTransformControlOptions
	) {}

	/**
	 * Create and return all transform control textures.
	 */
	createAll(): TextureKeys {
		return {
			resizeKnob: this.createResizeKnobTexture('resize-knob'),
			rotateKnob: this.createRotateKnobTexture('rotate-knob'),
			originKnob: this.createOriginKnobTexture('origin-knob'),
		}
	}

	private createOriginKnobTexture(textureKey: string) {
		const resolution = this.options.originKnob.resolution
		let { radius, lineThickness } = this.options.originKnob
		const { lineColor } = this.options.originKnob
		radius *= resolution
		lineThickness *= resolution

		const centerX = radius + lineThickness
		const centerY = centerX

		const graphics = this.scene.make.graphics()
		graphics.fillStyle(0xffffff, 1)
		graphics.fillCircle(centerX, centerY, radius)

		graphics.lineStyle(lineThickness, lineColor, 1)
		graphics.strokeCircle(centerX, centerY, radius)

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
}

export class HandleFactory {
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly options: ReadonlyTransformControlOptions,
		private readonly textures: TextureKeys
	) {}

	/**
	 * Create all transform control handles and return structured references.
	 */
	create(): TransformControlHandles {
		const innerContainer = this.scene.add.container(0, 0)
		innerContainer.setName('handles-container')

		const borders: BorderHandles = {
			top: this.addTopBorder(innerContainer),
			bottom: this.addBottomBorder(innerContainer),
			left: this.addLeftBorder(innerContainer),
			right: this.addRightBorder(innerContainer),
		}

		const rotateKnobs: CornerHandles = {
			topLeft: this.addRotateKnob(innerContainer, 'top-left-rotate-knob'),
			topRight: this.addRotateKnob(innerContainer, 'top-right-rotate-knob'),
			bottomLeft: this.addRotateKnob(innerContainer, 'bottom-left-rotate-knob'),
			bottomRight: this.addRotateKnob(innerContainer, 'bottom-right-rotate-knob'),
		}

		const resizeKnobs: CornerHandles = {
			topLeft: this.addResizeKnob(innerContainer, 'top-left-resize-knob'),
			topRight: this.addResizeKnob(innerContainer, 'top-right-resize-knob'),
			bottomLeft: this.addResizeKnob(innerContainer, 'bottom-left-resize-knob'),
			bottomRight: this.addResizeKnob(innerContainer, 'bottom-right-resize-knob'),
		}

		const originKnob = this.addOriginKnob(innerContainer)

		const all = [
			borders.top,
			borders.bottom,
			borders.left,
			borders.right,
			rotateKnobs.topLeft,
			rotateKnobs.topRight,
			rotateKnobs.bottomLeft,
			rotateKnobs.bottomRight,
			resizeKnobs.topLeft,
			resizeKnobs.topRight,
			resizeKnobs.bottomLeft,
			resizeKnobs.bottomRight,
			originKnob,
		]

		return { innerContainer, borders, rotateKnobs, resizeKnobs, originKnob, all }
	}

	private addTopBorder(container: Phaser.GameObjects.Container) {
		const border = this.scene.add.image(0, 0, '__WHITE')
		border.name = 'top-border'
		border.displayHeight = this.options.resizeBorders.thickness
		border.setOrigin(0, 0.5)
		container.add(border)
		return border
	}

	private addBottomBorder(container: Phaser.GameObjects.Container) {
		const border = this.scene.add.image(0, 0, '__WHITE')
		border.name = 'bottom-border'
		border.displayHeight = this.options.resizeBorders.thickness
		border.setOrigin(0, 0.5)
		container.add(border)
		return border
	}

	private addLeftBorder(container: Phaser.GameObjects.Container) {
		const border = this.scene.add.image(0, 0, '__WHITE')
		border.name = 'left-border'
		border.displayWidth = this.options.resizeBorders.thickness
		border.setOrigin(0.5, 0)
		container.add(border)
		return border
	}

	private addRightBorder(container: Phaser.GameObjects.Container) {
		const border = this.scene.add.image(0, 0, '__WHITE')
		border.name = 'right-border'
		border.displayWidth = this.options.resizeBorders.thickness
		border.setOrigin(0.5, 0)
		container.add(border)
		return border
	}

	private addRotateKnob(container: Phaser.GameObjects.Container, name: string) {
		const knob = this.scene.add.image(0, 0, this.textures.rotateKnob)
		knob.name = name
		knob.setOrigin(0.5, 0.5)
		container.add(knob)
		return knob
	}

	private addResizeKnob(container: Phaser.GameObjects.Container, name: string) {
		const knob = this.scene.add.image(0, 0, this.textures.resizeKnob)
		knob.name = name
		knob.setOrigin(0.5, 0.5)
		container.add(knob)
		return knob
	}

	private addOriginKnob(container: Phaser.GameObjects.Container) {
		const knob = this.scene.add.image(0, 0, this.textures.originKnob)
		knob.name = 'origin-knob'
		knob.setOrigin(0.5, 0.5)
		knob.setScale(1 / this.options.originKnob.resolution)
		container.add(knob)
		return knob
	}
}

/**
 * Set a rectangular hit area for a knob-like input target.
 */
export function setRectHitArea(input: Phaser.Types.Input.InteractiveObject, size: number): void {
	input.hitArea = new Phaser.Geom.Rectangle(0, 0, size, size)
	input.hitAreaCallback = Phaser.Geom.Rectangle.Contains
}

/**
 * Set a circular hit area for a knob-like input target.
 */
export function setCircleHitArea(input: Phaser.Types.Input.InteractiveObject, radius: number): void {
	input.hitArea = new Phaser.Geom.Circle(radius, radius, radius)
	input.hitAreaCallback = Phaser.Geom.Circle.Contains
}

/**
 * Inflate an existing rectangular hit area by the given padding values.
 */
export function inflateBorderHitArea(
	input: Phaser.Types.Input.InteractiveObject,
	paddingX: number,
	paddingY: number
): void {
	Phaser.Geom.Rectangle.Inflate(input.hitArea, paddingX, paddingY)
}
