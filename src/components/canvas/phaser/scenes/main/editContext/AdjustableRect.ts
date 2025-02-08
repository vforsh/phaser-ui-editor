import { EditableObject } from '../objects/IEditableObject'

export type AdjustableRectOptions = {
	thickness: number
	color: number
}

/**
 * Rect that adjusts its transform (size, angle) to provided game object.
 */
export class AdjustableRect extends Phaser.GameObjects.Container {
	private options: AdjustableRectOptions
	private graphics: Phaser.GameObjects.Graphics

	constructor(scene: Phaser.Scene, options: AdjustableRectOptions) {
		super(scene)

		this.options = options

		this.graphics = scene.make.graphics()
		this.graphics.lineStyle(options.thickness, options.color, 1)
		this.graphics.strokeRect(0, 0, 0, 0)
		this.add(this.graphics)
	}

	public adjustTo(go: EditableObject): void {
		// adjust to object display size
		this.graphics.clear()
		this.graphics.lineStyle(this.options.thickness, this.options.color, 1)
		this.graphics.strokeRect(0, 0, go.displayWidth, go.displayHeight)

		// adjust to object position (account for origin)
		const offsetX = -go.displayWidth * (go.getData('originX') ?? go.originX)
		const offsetY = -go.displayHeight * (go.getData('originY') ?? go.originY)
		this.graphics.setPosition(offsetX, offsetY)
		this.setPosition(go.x, go.y)

		// adjust to object angle
		this.angle = go.angle
	}
}
