export type Transformable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export function isTransformable(go: Phaser.GameObjects.GameObject): go is Transformable {
	return (
		go instanceof Phaser.GameObjects.Image ||
		go instanceof Phaser.GameObjects.Sprite ||
		go instanceof Phaser.GameObjects.Container
	)
}

export function calculateBounds(objects: Transformable[], rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	if (objects.length === 1) {
		return calculateBoundsSingle(objects[0], rect)
	}

	const point = new Phaser.Math.Vector2()
	const offset = new Phaser.Math.Vector2()
	let left = Infinity,
		right = -Infinity,
		top = Infinity,
		bottom = -Infinity

	objects.forEach((obj) => {
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

function calculateBoundsSingle(obj: Transformable, rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	const left = obj.x - (obj.getData('originX') ?? obj.originX) * obj.displayWidth
	const right = obj.x + (1 - (obj.getData('originX') ?? obj.originX)) * obj.displayWidth
	const top = obj.y - (obj.getData('originY') ?? obj.originY) * obj.displayHeight
	const bottom = obj.y + (1 - (obj.getData('originY') ?? obj.originY)) * obj.displayHeight

	if (rect) {
		return rect.setTo(left, top, right - left, bottom - top)
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}

export type TransformableOrigin = Transformable & {
	setOrigin: (x: number, y: number) => void
}

export function canChangeOrigin(obj: Transformable): obj is TransformableOrigin {
	return 'setOrigin' in obj && typeof obj.setOrigin === 'function'
}
