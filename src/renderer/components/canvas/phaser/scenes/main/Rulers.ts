export class Rulers extends Phaser.GameObjects.Container {
	private texts: Phaser.GameObjects.Text[] = []

	constructor(scene: Phaser.Scene) {
		super(scene)
	}

	// TODO it hangs on large zoom (probably because of the too many texts)
	public redraw(
		gameSize: { width: number; height: number },
		cameraZoom: number,
		cameraScrollX: number,
		cameraScrollY: number
	): void {
		this.texts.forEach((text) => text.kill())

		const width = gameSize.width / cameraZoom
		const height = gameSize.height / cameraZoom

		const marginX = 5
		const marginY = 5

		// Calculate visible area bounds accounting for camera scroll and zoom
		const visibleLeft = cameraScrollX - width / 2 + (width / 2) * cameraZoom
		const visibleTop = cameraScrollY - height / 2 + (height / 2) * cameraZoom

		const labelScale = Phaser.Math.Clamp(1 / cameraZoom, 0.5, 3)

		// add less texts when zoom is small
		// add more texts when zoom is large
		const cellSize = Phaser.Math.Snap.Floor(Phaser.Math.Clamp(100 / cameraZoom, 25, 200), 50)

		// add texts to the left and right of the camera
		let rowsNum = (Math.ceil(height / cellSize) + 1) * 2

		// TODO remove later
		if (rowsNum > 100) {
			rowsNum = 100
		}

		for (let row = -rowsNum / 2; row <= rowsNum / 2; row += 1) {
			let y = row * cellSize

			let leftText = this.getOrCreateText()
			leftText.setText(y.toString())
			leftText.setOrigin(0, 0.5)
			leftText.setScale(labelScale)
			leftText.x = visibleLeft + marginX
			leftText.y = y
			leftText.revive()

			// let rightText = this.getOrCreateText()
			// rightText.setText(y.toString())
			// rightText.setOrigin(1, 0.5)
			// rightText.setScale(labelScale)
			// rightText.x = visibleLeft + width - marginX
			// rightText.y = y
			// rightText.revive()
		}

		// add texts to the bottom of the camera
		let columnsNum = (Math.ceil(width / cellSize) + 1) * 2

		// TODO remove later
		if (columnsNum > 100) {
			columnsNum = 100
		}

		for (let col = -columnsNum / 2; col <= columnsNum / 2; col += 1) {
			const x = col * cellSize

			let bottomText = this.getOrCreateText()
			bottomText.setText(x.toString())
			bottomText.setOrigin(0.5, 1)
			bottomText.setScale(labelScale)
			bottomText.x = x
			bottomText.y = visibleTop + height - marginY
			bottomText.revive()
		}
	}

	getOrCreateText(): Phaser.GameObjects.Text {
		let text = this.texts.find((text) => text.active === false)
		if (!text) {
			text = this.scene.make.text(
				{
					style: {
						// TODO load web font in Phaser
						fontFamily: 'Nunito',
						fontSize: '16px',
						color: `rgba(255, 255, 255, 0.66)`,
						resolution: devicePixelRatio,
						backgroundColor: '#242424',
						padding: { x: 5, y: 5 },
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
