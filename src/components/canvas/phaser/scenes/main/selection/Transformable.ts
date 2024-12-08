export type Transformable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export function isTransformable(go: Phaser.GameObjects.GameObject): go is Transformable {
	return go instanceof Phaser.GameObjects.Image || go instanceof Phaser.GameObjects.Sprite || go instanceof Phaser.GameObjects.Container
}
