import { ReadonlyDeep } from 'type-fest'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { calculateBounds, Transformable } from './Transformable'

type Events = {
	changed: (type: 'add' | 'remove', object: Transformable) => void
	destroyed: () => void
}

/**
 * A wrapper around an array of transformable objects.
 * It auto-destroys itself when empty (i.e. when all objects are removed).
 * Objects auto-remove themselves from the selection when destroyed.
 *
 * **DO NOT instantiate this class directly, use `SelectionManager.createSelection()` instead.**
 */
export class Selection extends TypedEventEmitter<Events> {
	public objects: Transformable[]
	private _bounds: Phaser.Geom.Rectangle

	constructor(objects: Transformable[]) {
		super()

		this.objects = objects

		this._bounds = this.updateBounds()
	}

	public add(object: Transformable): void {
		if (this.objects.includes(object)) {
			return
		}

		this.objects.push(object)
		this._bounds = this.updateBounds()

		this.emit('changed', 'add', object)
	}

	/**
	 * Removes an object from the selection.
	 * It will **auto-destroy** the selection if it becomes empty.
	 * @returns `true` if the selection became empty after the removal and was destroyed, `false` otherwise.
	 */
	public remove(object: Transformable): boolean {
		if (!this.objects.includes(object)) {
			return false
		}

		this.objects = this.objects.filter((o) => o !== object)
		this._bounds = this.updateBounds()

		this.emit('changed', 'remove', object)

		if (this.isEmpty) {
			this.destroy()
			return true
		}

		return false
	}

	public includes(object: Transformable): boolean {
		return this.objects.includes(object)
	}

	public updateBounds(): Phaser.Geom.Rectangle {
		this._bounds = calculateBounds(this.objects)
		return this._bounds
	}

	public at(index: number): Transformable | undefined {
		return this.objects[index]
	}

	public move(dx: number, dy = 0): Selection {
		this.objects.forEach((obj) => {
			obj.x += dx
			obj.y += dy
		})

		this._bounds = this.updateBounds()

		return this
	}

	public destroy(): void {
		this.emit('destroyed')

		super.destroy()

		this.objects.length = 0
	}

	public get x(): number {
		return this._bounds.x
	}

	public get y(): number {
		return this._bounds.y
	}

	public get width(): number {
		return this._bounds.width
	}

	public get height(): number {
		return this._bounds.height
	}

	public get isEmpty(): boolean {
		return this.size === 0
	}

	public get size(): number {
		return this.objects.length
	}

	public get bounds(): ReadonlyDeep<Phaser.Geom.Rectangle> {
		return this._bounds
	}
}
