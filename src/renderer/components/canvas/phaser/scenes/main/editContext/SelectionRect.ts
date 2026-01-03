import { ReadonlyDeep } from 'type-fest'
import { Vector2Like } from '../../../PhaserApp'

export type SelectionRectOptions = {
	fillColor: number
	fillAlpha: number
	outlineThickness: number
	outlineColor: number
}

/**
 * Display selection rectangle, allow to select multiple objects.
 */
export class SelectionRect extends Phaser.GameObjects.Container {
	private options: SelectionRectOptions
	private graphics: Phaser.GameObjects.Graphics
	private _bounds: Phaser.Geom.Rectangle

	constructor(scene: Phaser.Scene, options: SelectionRectOptions) {
		super(scene)

		this.options = options

		this.graphics = scene.make.graphics({}, false)
		this.add(this.graphics)

		this._bounds = new Phaser.Geom.Rectangle()
	}

	public resetBounds(): void {
		this._bounds.setTo(0, 0, 0, 0)
	}

	public draw(from: Vector2Like, to: Vector2Like): void {
		const left = Math.min(from.x, to.x)
		const top = Math.min(from.y, to.y)
		const width = Math.abs(to.x - from.x)
		const height = Math.abs(to.y - from.y)

		this.graphics.clear()
		this.graphics.fillStyle(this.options.fillColor, this.options.fillAlpha)
		this.graphics.fillRect(left, top, width, height)
		this.graphics.lineStyle(this.options.outlineThickness, this.options.outlineColor, 1)
		this.graphics.strokeRect(left, top, width, height)

		this._bounds.setTo(left, top, width, height)
	}

	public get bounds(): ReadonlyDeep<Phaser.Geom.Rectangle> {
		return this._bounds
	}
}
