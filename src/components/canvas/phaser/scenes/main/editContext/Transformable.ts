import { EditableObject } from '../objects/EditableObject'
import { getEditableWorldBounds } from './object-bounds'

export function calculateBounds(objects: EditableObject[], rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	if (objects.length === 1) {
		return calculateBoundsSingle(objects[0], rect)
	}

	const point = new Phaser.Math.Vector2()
	const offset = new Phaser.Math.Vector2()
	let left = Infinity
	let right = -Infinity
	let top = Infinity
	let bottom = -Infinity

	objects.forEach((obj) => {
		if (obj.kind === 'Container') {
			const bounds = getEditableWorldBounds(obj)
			left = Math.min(left, bounds.left)
			right = Math.max(right, bounds.right)
			top = Math.min(top, bounds.top)
			bottom = Math.max(bottom, bounds.bottom)
			return
		}

		const sin = Math.sin(obj.rotation)
		const cos = Math.cos(obj.rotation)
		const originX = obj.getData('originX') ?? obj.originX
		const originY = obj.getData('originY') ?? obj.originY

		// Top-left
		point.set(obj.x - obj.displayWidth * originX, obj.y - obj.displayHeight * originY)
		offset.set(point.x - obj.x, point.y - obj.y)
		point.set(obj.x + (offset.x * cos - offset.y * sin), obj.y + (offset.x * sin + offset.y * cos))
		left = Math.min(left, point.x)
		right = Math.max(right, point.x)
		top = Math.min(top, point.y)
		bottom = Math.max(bottom, point.y)

		// Top-right
		point.set(obj.x + obj.displayWidth * (1 - originX), obj.y - obj.displayHeight * originY)
		offset.set(point.x - obj.x, point.y - obj.y)
		point.set(obj.x + (offset.x * cos - offset.y * sin), obj.y + (offset.x * sin + offset.y * cos))
		left = Math.min(left, point.x)
		right = Math.max(right, point.x)
		top = Math.min(top, point.y)
		bottom = Math.max(bottom, point.y)

		// Bottom-left
		point.set(obj.x - obj.displayWidth * originX, obj.y + obj.displayHeight * (1 - originY))
		offset.set(point.x - obj.x, point.y - obj.y)
		point.set(obj.x + (offset.x * cos - offset.y * sin), obj.y + (offset.x * sin + offset.y * cos))
		left = Math.min(left, point.x)
		right = Math.max(right, point.x)
		top = Math.min(top, point.y)
		bottom = Math.max(bottom, point.y)

		// Bottom-right
		point.set(obj.x + obj.displayWidth * (1 - originX), obj.y + obj.displayHeight * (1 - originY))
		offset.set(point.x - obj.x, point.y - obj.y)
		point.set(obj.x + (offset.x * cos - offset.y * sin), obj.y + (offset.x * sin + offset.y * cos))
		left = Math.min(left, point.x)
		right = Math.max(right, point.x)
		top = Math.min(top, point.y)
		bottom = Math.max(bottom, point.y)
	})

	if (rect) {
		return rect.setTo(left, top, right - left, bottom - top)
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}

export function calculateBoundsSingle(obj: EditableObject, rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	if (obj.kind === 'Container') {
		return getEditableWorldBounds(obj, rect)
	}

	const originX = obj.getData('originX') ?? obj.originX
	const originY = obj.getData('originY') ?? obj.originY
	const w = obj.displayWidth
	const h = obj.displayHeight

	const left = obj.x - originX * w
	const right = obj.x + (1 - originX) * w
	const top = obj.y - originY * h
	const bottom = obj.y + (1 - originY) * h

	if (rect) {
		return rect.setTo(left, top, right - left, bottom - top)
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}

export type TransformableOrigin = EditableObject & {
	setOrigin: (x: number, y: number) => void
}

export function canChangeOrigin(obj: EditableObject): obj is TransformableOrigin {
	return 'setOrigin' in obj && typeof obj.setOrigin === 'function'
}
