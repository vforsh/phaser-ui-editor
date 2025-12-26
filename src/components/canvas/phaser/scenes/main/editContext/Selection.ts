import { ReadonlyDeep } from 'type-fest'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { EditableObject } from '../objects/EditableObject'
import { calculateBounds } from './Transformable'
import { getEditableWorldBounds } from './object-bounds'

type Events = {
	changed: (type: 'add' | 'remove', object: EditableObject) => void
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
	public objects: EditableObject[]
	private readonly _parent: Phaser.GameObjects.Container
	private _bounds: Phaser.Geom.Rectangle
	private _originX = 0.5
	private _originY = 0.5

	constructor(parent: Phaser.GameObjects.Container, objects: EditableObject[]) {
		super()

		this._parent = parent

		this.objects = objects

		this._bounds = this.updateBounds()

		this.onObjectsChanged()
	}

	public add(object: EditableObject): void {
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
	public remove(object: EditableObject): boolean {
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
			if (obj.kind === 'Container') {
				const bounds = getEditableWorldBounds(obj)
				if (bounds.width <= 0 || bounds.height <= 0) {
					this._originX = 0.5
					this._originY = 0.5
					return
				}

				this._originX = clamp01((obj.x - bounds.left) / bounds.width)
				this._originY = clamp01((obj.y - bounds.top) / bounds.height)
				return
			}

			this._originX = obj.getData('originX') ?? obj.originX
			this._originY = obj.getData('originY') ?? obj.originY
		} else {
			this._originX = 0.5
			this._originY = 0.5
		}
	}

	public includes(object: EditableObject): boolean {
		return this.objects.includes(object)
	}

	public updateBounds(): Phaser.Geom.Rectangle {
		this._bounds = calculateBounds(this.objects)
		return this._bounds
	}

	public at(index: number): EditableObject | undefined {
		return this.objects[index]
	}

	public move(dx: number, dy = 0): Selection {
		this.objects.forEach((obj) => {
			obj.setPosition(obj.x + dx, obj.y + dy)
		})

		this._bounds = this.updateBounds()

		return this
	}

	public toLocal(worldX: number, worldY: number): Phaser.Types.Math.Vector2Like {
		return this._parent.localTransform.transformPoint(worldX, worldY)
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
		return this.count === 0
	}

	/**
	 * The number of objects in the selection.
	 */
	public get count(): number {
		return this.objects.length
	}

	public get angle(): number {
		return this.objects.length === 1 ? this.objects[0].angle : 0
	}

	public get rotation(): number {
		return this.objects.length === 1 ? this.objects[0].rotation : 0
	}
	
	public get bounds(): ReadonlyDeep<Phaser.Geom.Rectangle> {
		return this._bounds
	}

	public get originX(): number {
		return this._originX
	}

	public get originY(): number {
		return this._originY
	}

	public setOrigin(x: number, y: number): void {
		this._originX = x
		this._originY = y
	}

	public get objectsAsString(): string {
		return `[${this.objects.map((obj) => obj.name).join(', ')}] (${this.count})`
	}

	public get parent(): Phaser.GameObjects.Container {
		return this._parent
	}
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}
