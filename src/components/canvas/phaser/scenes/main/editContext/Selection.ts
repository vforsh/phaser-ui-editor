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
	private _originX = 0.5
	private _originY = 0.5

	constructor(objects: Transformable[]) {
		super()

		this.objects = objects

		this._bounds = this.updateBounds()

		this.onObjectsChanged()
	}

	public add(object: Transformable): void {
		if (this.objects.includes(object)) {
			return
		}

		this.objects.push(object)
		this._bounds = this.updateBounds()
		this.onObjectsChanged()

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
		this.onObjectsChanged()
		this.emit('changed', 'remove', object)

		if (this.isEmpty) {
			this.destroy()
			return true
		}

		return false
	}

	private onObjectsChanged(): void {
		if (this.objects.length === 1) {
			const obj = this.objects[0]
			this._originX = obj.originX
			this._originY = obj.originY
		} else {
			this._originX = 0.5
			this._originY = 0.5
		}
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

	/**
	 * The x-coordinate of the selection with respect to the origin.
	 */
	public get x(): number {
		return this._bounds.left + this._originX * this._bounds.width
	}
	
	/**
	 * The y-coordinate of the selection with respect to the origin.
	 */
	public get y(): number {
		return this._bounds.top + this._originY * this._bounds.height
	}

	public get centerX(): number {
		return this._bounds.centerX
	}

	public get centerY(): number {
		return this._bounds.centerY
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

	/**
	 * The number of objects in the selection.
	 */
	public get size(): number {
		return this.objects.length
	}

	public get bounds(): ReadonlyDeep<Phaser.Geom.Rectangle> {
		return this._bounds
	}

	public get originX(): number {
		return this._originX
	}

	// public set originX(value: number) {
	// this._originX = value
	// }

	public get originY(): number {
		return this._originY
	}

	// public set originY(value: number) {
	// this._originY = value
	// }
}
