import { EditContext } from './editContext/EditContext'

export type EditContextFrameOptions = {
	thickness: number
	color: number
}

/**
 * Rect that adjusts its transform (size, angle) to provided game object.
 */
export class EditContextFrame extends Phaser.GameObjects.Container {
	private options: EditContextFrameOptions
	private graphics: Phaser.GameObjects.Graphics
	private context: EditContext

	constructor(scene: Phaser.Scene, context: EditContext, options: EditContextFrameOptions) {
		super(scene)

		this.options = options

		this.graphics = scene.make.graphics()
		this.graphics.lineStyle(options.thickness, options.color, 1)
		this.graphics.strokeRect(0, 0, 0, 0)
		this.add(this.graphics)

		this.context = context
		this.adjustTo(context)
	}

	public adjustTo(context: EditContext): void {
		this.context = context

		const target = context.target

		const pos = context.target.getWorldPosition()

		// adjust to object display size
		this.graphics.clear()
		this.graphics.lineStyle(this.options.thickness, this.options.color, 1)
		this.graphics.strokeRect(0, 0, context.target.displayWidth, context.target.displayHeight)

		// adjust to object position (account for origin)
		const offsetX = -target.displayWidth * (target.getData('originX') ?? target.originX)
		const offsetY = -target.displayHeight * (target.getData('originY') ?? target.originY)
		this.graphics.setPosition(offsetX, offsetY)
		this.setPosition(pos.x, pos.y)

		// adjust to object angle
		this.angle = target.angle
	}

	public get aabbSize(): { width: number; height: number } {
		// rotation in radians
		const rotation = this.context.target.rotation
		const width = this.context.target.displayWidth
		const height = this.context.target.displayHeight

		const cos = Math.abs(Math.cos(rotation))
		const sin = Math.abs(Math.sin(rotation))

		return {
			width: width * cos + height * sin,
			height: width * sin + height * cos,
		}
	}
}
