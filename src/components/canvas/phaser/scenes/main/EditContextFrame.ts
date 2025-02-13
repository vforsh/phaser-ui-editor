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
	private destroyCtrl = new AbortController()

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
		if (this.context) {
			this.context.target.events.offByContext(this, 'size-changed')
		}

		this.context = context

		const target = context.target

		target.events.on('size-changed', () => this.redraw(target), this, this.destroyCtrl.signal)

		const pos = context.target.getWorldPosition()

		this.redraw(target)

		this.setPosition(pos.x, pos.y)

		// adjust to object angle
		this.angle = target.angle
	}

	private redraw(container: Phaser.GameObjects.Container): void {
		// adjust to object display size
		this.graphics.clear()
		this.graphics.lineStyle(this.options.thickness, this.options.color, 1)
		this.graphics.strokeRect(0, 0, container.displayWidth, container.displayHeight)

		// adjust to object origin
		const offsetX = -container.displayWidth * (container.getData('originX') ?? container.originX)
		const offsetY = -container.displayHeight * (container.getData('originY') ?? container.originY)
		this.graphics.setPosition(offsetX, offsetY)
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

	public destroy(): void {
		this.destroyCtrl.abort()

		super.destroy()
	}
}
