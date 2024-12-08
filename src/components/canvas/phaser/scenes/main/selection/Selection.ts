import { ReadonlyDeep } from 'type-fest'
import { Transformable } from './Transformable'

export class Selection {
	public objects: Transformable[]
	private _bounds: Phaser.Geom.Rectangle

	constructor(objects: Transformable[]) {
		this.objects = objects
		this._bounds = this.calculateBounds()
	}

	public add(object: Transformable): void {
		if (this.objects.includes(object)) {
			return
		}

		this.objects.push(object)
		this._bounds = this.calculateBounds()
	}

	public remove(object: Transformable): void {
		if (!this.objects.includes(object)) {
			return
		}

		this.objects = this.objects.filter((o) => o !== object)
		this._bounds = this.calculateBounds()
	}

	public has(object: Transformable): boolean {
		return this.objects.includes(object)
	}

	public calculateBounds(): Phaser.Geom.Rectangle {
		const left = this.objects.reduce((min, obj) => Math.min(min, obj.left), Infinity)
		const right = this.objects.reduce((max, obj) => Math.max(max, obj.right), -Infinity)
		const top = this.objects.reduce((min, obj) => Math.min(min, obj.top), Infinity)
		const bottom = this.objects.reduce((max, obj) => Math.max(max, obj.bottom), -Infinity)

		this._bounds = new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)

		return this._bounds
	}

	public at(index: number): Transformable | undefined {
		return this.objects[index]
	}

	public destroy(): void {
		this.objects.length = 0
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
