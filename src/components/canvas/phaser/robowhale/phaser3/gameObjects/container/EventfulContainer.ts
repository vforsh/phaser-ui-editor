type Events = {
	/**
	 * @param {Phaser.GameObjects.GameObject} gameObject - The Game Object that was just added to this Container.
	 */
	'child-added': (gameObject: Phaser.GameObjects.GameObject) => void
	/**
	 * @param gameObject - The Game Object that was just removed from this Container.
	 */
	'child-removed': (gameObject: Phaser.GameObjects.GameObject) => void
}

/**
 * A Container that emits events when children are added or removed.
 * The events are not emitted when the container is destroyed.
 */
export class EventfulContainer extends Phaser.GameObjects.Container {
	constructor(scene: Phaser.Scene, x = 0, y = 0, children: Phaser.GameObjects.GameObject[] = []) {
		super(scene, x, y, children)
	}

	override addHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.addHandler(gameObject)

		this.emit('child-added', gameObject)
	}

	override removeHandler(gameObject: Phaser.GameObjects.GameObject): void {
		super.removeHandler(gameObject)

		this.emit('child-removed', gameObject)
	}
}
