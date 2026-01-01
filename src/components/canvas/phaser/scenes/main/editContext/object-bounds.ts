import { EditableObject } from '../objects/EditableObject'

type ContainerWithEditables = EditableObject & {
	editables: EditableObject[]
}

/**
 * Computes an object's bounds in world space, with special handling for editable containers.
 *
 * - For non-container objects: delegates to Phaser's `getBounds`.
 * - For containers with `editables`: returns a union of the bounds of all editable descendants (recursive).
 * - For containers without editables / empty editables: falls back to the container's own `getBounds`.
 *
 * If `rect` is provided, it is mutated and returned to avoid allocations.
 */
export function getEditableWorldBounds(obj: EditableObject, rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	if (obj.kind !== 'Container') {
		return obj.getBounds(rect)
	}

	if (!hasEditables(obj)) {
		return obj.getBounds(rect)
	}

	const children = obj.editables
	if (children.length === 0) {
		return obj.getBounds(rect)
	}

	let left = Infinity
	let right = -Infinity
	let top = Infinity
	let bottom = -Infinity

	children.forEach((child) => {
		const b = getEditableWorldBounds(child)
		left = Math.min(left, b.left)
		right = Math.max(right, b.right)
		top = Math.min(top, b.top)
		bottom = Math.max(bottom, b.bottom)
	})

	const width = right - left
	const height = bottom - top

	if (rect) {
		return rect.setTo(left, top, width, height)
	}

	return new Phaser.Geom.Rectangle(left, top, width, height)
}

/**
 * Computes a container's box bounds in world space using its own width/height.
 * Children are ignored.
 */
export function getContainerBoxWorldBounds(
	obj: EditableObject,
	rect?: Phaser.Geom.Rectangle
): Phaser.Geom.Rectangle {
	if (obj.kind !== 'Container') {
		return obj.getBounds(rect)
	}

	const halfW = obj.width * 0.5
	const halfH = obj.height * 0.5
	const sin = Math.sin(obj.rotation)
	const cos = Math.cos(obj.rotation)
	const scaleX = obj.scaleX
	const scaleY = obj.scaleY
	const x = obj.x
	const y = obj.y

	let left = Infinity
	let right = -Infinity
	let top = Infinity
	let bottom = -Infinity

	const applyCorner = (cornerX: number, cornerY: number) => {
		const scaledX = cornerX * scaleX
		const scaledY = cornerY * scaleY
		const rotatedX = scaledX * cos - scaledY * sin
		const rotatedY = scaledX * sin + scaledY * cos
		const worldX = x + rotatedX
		const worldY = y + rotatedY

		left = Math.min(left, worldX)
		right = Math.max(right, worldX)
		top = Math.min(top, worldY)
		bottom = Math.max(bottom, worldY)
	}

	applyCorner(-halfW, -halfH)
	applyCorner(halfW, -halfH)
	applyCorner(halfW, halfH)
	applyCorner(-halfW, halfH)

	if (rect) {
		return rect.setTo(left, top, right - left, bottom - top)
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}

function hasEditables(obj: EditableObject): obj is ContainerWithEditables {
	if (!('editables' in obj)) {
		return false
	}

	return Array.isArray((obj as ContainerWithEditables).editables)
}

