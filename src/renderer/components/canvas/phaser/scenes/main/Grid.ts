export class Grid extends Phaser.GameObjects.Container {
	private graphics: Phaser.GameObjects.Graphics

	constructor(scene: Phaser.Scene) {
		super(scene)

		this.graphics = scene.add.graphics()
		this.add(this.graphics)
	}

	public redraw(
		gameSize: { width: number; height: number },
		camera: Phaser.Cameras.Scene2D.Camera,
		scrollX: number,
		scrollY: number,
	): void {
		this.redrawGrid(gameSize, camera, scrollX, scrollY)
	}

	private redrawGrid(
		gameSize: { width: number; height: number },
		camera: Phaser.Cameras.Scene2D.Camera,
		scrollX: number,
		scrollY: number,
	) {
		// TODO account for camera scroll

		const cameraZoom = camera.zoom

		let cellSize = 100

		const width = Math.max(gameSize.width, gameSize.width / cameraZoom)

		const height = Math.max(gameSize.height, gameSize.height / cameraZoom)

		let thickness = Phaser.Math.RoundTo(Math.min(1.5, 0.33 / cameraZoom), -2)

		let alpha = Phaser.Math.Clamp(0.05 / cameraZoom, 0.2, 0.4)

		this.graphics.clear()

		this.graphics.lineStyle(thickness, 0xffffff, alpha)

		// Draw horizontal lines
		let rowsNum = (Math.ceil(height / cellSize) + 1) * 2
		for (let row = -rowsNum / 2; row <= rowsNum / 2; row += 1) {
			let y = row * cellSize
			this.graphics.lineBetween(-width, y, width, y)
		}

		// Draw vertical  lines
		let columnsNum = (Math.ceil(width / cellSize) + 1) * 2
		for (let col = -columnsNum / 2; col <= columnsNum / 2; col += 1) {
			const x = col * cellSize
			this.graphics.lineBetween(x, -height, x, height)
		}

		// console.log({ cameraZoom, thickness, alpha, /* rows: rowsNum, columns: columnsNum, width, height */ })

		// TODO draw subgrid with cellSize / 2, thickness / 2 and alpha / 2
	}
}
