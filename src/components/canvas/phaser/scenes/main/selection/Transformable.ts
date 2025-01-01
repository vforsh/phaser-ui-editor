export type Transformable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export function isTransformable(go: Phaser.GameObjects.GameObject): go is Transformable {
	return go instanceof Phaser.GameObjects.Image || go instanceof Phaser.GameObjects.Sprite || go instanceof Phaser.GameObjects.Container
}

export function calculateBounds(objects: Transformable[], rect?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
	const left = objects.reduce((min, obj) => Math.min(min, obj.left), Infinity)
	const right = objects.reduce((max, obj) => Math.max(max, obj.right), -Infinity)
	const top = objects.reduce((min, obj) => Math.min(min, obj.top), Infinity)
	const bottom = objects.reduce((max, obj) => Math.max(max, obj.bottom), -Infinity)
	
	if (rect) {
		rect.setTo(left, top, right - left, bottom - top)
		return rect
	}

	return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
}
