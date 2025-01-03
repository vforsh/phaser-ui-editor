export type Transformable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export function isTransformable(go: Phaser.GameObjects.GameObject): go is Transformable {
	return (
		go instanceof Phaser.GameObjects.Image ||
		go instanceof Phaser.GameObjects.Sprite ||
		go instanceof Phaser.GameObjects.Container
	)
}

export function calculateBounds(objects: Transformable[], rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	const left = objects.reduce((min, obj) => {
		const left = obj.x - (obj.getData('originX') ?? obj.originX) * obj.displayWidth
		return Math.min(min, left)
	}, Infinity)

	const right = objects.reduce((max, obj) => {
		const right = obj.x + (1 - (obj.getData('originX') ?? obj.originX)) * obj.displayWidth
		return Math.max(max, right)
	}, -Infinity)

	const top = objects.reduce((min, obj) => {
		const top = obj.y - (obj.getData('originY') ?? obj.originY) * obj.displayHeight
		return Math.min(min, top)
	}, Infinity)

	const bottom = objects.reduce((max, obj) => {
		const bottom = obj.y + (1 - (obj.getData('originY') ?? obj.originY)) * obj.displayHeight
		return Math.max(max, bottom)
	}, -Infinity)

	if (rect) {
		rect.setTo(left, top, right - left, bottom - top)
		return rect
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}

export type TransformableOrigin = Transformable & {
	setOrigin: (x: number, y: number) => void
}

export function canChangeOrigin(obj: Transformable): obj is TransformableOrigin {
	return 'setOrigin' in obj && typeof obj.setOrigin === 'function'
}
