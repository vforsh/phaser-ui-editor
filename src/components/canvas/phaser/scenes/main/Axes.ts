export class Axes extends Phaser.GameObjects.Container {
	// TODO use bitmap texts
	private texts: Phaser.GameObjects.Text[] = []

	constructor(scene: Phaser.Scene) {
		super(scene)
	}

	public redraw(gameSize: { width: number; height: number }, cameraZoom: number, cameraScrollX: number, cameraScrollY: number): void {
		this.texts.forEach((text) => text.kill())

		let cellSize = 100

		const width = gameSize.width / cameraZoom

		const height = gameSize.height / cameraZoom

		let rowsNum = (Math.ceil(height / cellSize) + 1) * 2
		for (let row = -rowsNum / 2; row <= rowsNum / 2; row += 1) {
			let y = row * cellSize

			let leftText = this.getOrCreateText()
			leftText.setText(y.toString())
			leftText.setOrigin(0, 1)
			leftText.x = 0 + 5
			leftText.y = y - 5
			leftText.revive()

			let rightText = this.getOrCreateText()
			rightText.setText(y.toString())
			rightText.setOrigin(1, 1)
			rightText.x = width - 5
			rightText.y = y - 5
			rightText.revive()
		}

		let columnsNum = (Math.ceil(width / cellSize) + 1) * 2
		for (let col = -columnsNum / 2; col <= columnsNum / 2; col += 1) {
			const x = col * cellSize

			let bottomText = this.getOrCreateText()
			bottomText.setText(x.toString())
			bottomText.setOrigin(0.5, 1)
			bottomText.x = x
			bottomText.y = height - 5
			bottomText.revive()
		}
	}

	getOrCreateText(): Phaser.GameObjects.Text {
		let text = this.texts.find((text) => text.active === false)
		if (!text) {
			text = this.scene.make.text(
				{
					style: {
						resolution: devicePixelRatio,
						fontSize: '20px',
						color: '#ffffff',
						backgroundColor: '#303030',
					},
				},
				false
			)
			this.texts.push(text)
			this.add(text)
		}

		return text
	}
}
