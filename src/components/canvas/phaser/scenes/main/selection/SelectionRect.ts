export class SelectionRect extends Phaser.GameObjects.Container {
	private graphics: Phaser.GameObjects.Graphics

	constructor(scene: Phaser.Scene) {
		super(scene, 0, 0)

		this.graphics = scene.make.graphics()
		this.graphics.lineStyle(2, 0x1854a8, 1)
		this.graphics.strokeRect(0, 0, 0, 0)
		this.add(this.graphics)
	}

	public resize(width: number, height: number): void {
		this.graphics.clear()
        this.graphics.lineStyle(2, 0x1854a8, 1)
		this.graphics.strokeRect(0, 0, width, height)
	}
}
