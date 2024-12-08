import { MainScene } from '../MainScene'
import { ResizeableRect } from './SelectionRect'
import { TransformControls } from './TransformControls'

export type Selectable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export class SelectionManager {
	private scene: MainScene
	private selectables: Selectable[] = []
	public selectedGameObject: Selectable | null = null
	private hoverRect!: ResizeableRect
	public transformControls!: TransformControls
	private hoverEnabled = true
	private destroyController = new AbortController()

	constructor(scene: MainScene) {
		this.scene = scene

		this.addHoverRect()
		this.addTransformControls()

		this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this, this.destroyController.signal)
	}

	private onPostUpdate(): void {
		if (this.selectedGameObject) {
			this.transformControls.setPosition(this.selectedGameObject.x, this.selectedGameObject.y)
		}
	}

	private addHoverRect() {
		this.hoverRect = new ResizeableRect(this.scene)
		this.hoverRect.setAlpha(0.5)
		this.scene.add.existing(this.hoverRect)
	}

	private addTransformControls() {
		this.transformControls = new TransformControls(this.scene, {
			resizeBorders: {
				thickness: 2,
				color: 0x1854a8,
				hitAreaPadding: 10,
			},
			resizeKnobs: {
				fillRadius: 6,
				fillColor: 0xffffff,
				outlineThickness: 2,
				outlineColor: 0x1854a8,
			},
			rotateKnobs: {
				radius: 15,
			},
		})

		this.transformControls.name = 'transform-controls'
		this.transformControls.kill()

		this.scene.add.existing(this.transformControls)
	}

	public addSelectable(go: Selectable): void {
		const signal = this.scene.shutdownSignal

		go.setInteractive()
		go.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onSelectablePointerDown.bind(this, go), this, signal)
		go.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.onSelectablePointerOver.bind(this, go), this, signal)
		go.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.onSelectablePointerOut.bind(this, go), this, signal)

		this.selectables.push(go)
	}

	public removeSelectable(gameObject: Selectable): void {
		gameObject.removeByContext(this)
		gameObject.removeInteractive()

		this.selectables = this.selectables.filter((selectable) => selectable !== gameObject)

		if (this.selectedGameObject === gameObject) {
			this.selectedGameObject = null
			this.transformControls.kill()
		}
	}

	private onSelectablePointerDown(gameObject: Selectable, pointer: Phaser.Input.Pointer, x: number, y: number): void {
		this.selectedGameObject = gameObject

		this.transformControls.resizeTo(gameObject.displayWidth, gameObject.displayHeight)
		this.transformControls.setPosition(gameObject.x, gameObject.y)
		this.transformControls.revive()
	}

	private onSelectablePointerOver(gameObject: Selectable): void {
		if (!this.hoverEnabled) {
			return
		}

		if (this.selectedGameObject === gameObject) {
			return
		}

		this.hoverRect.resize(gameObject.displayWidth, gameObject.displayHeight)
		this.hoverRect.setPosition(gameObject.x, gameObject.y)
		this.hoverRect.revive()
	}

	private onSelectablePointerOut(gameObject: Selectable): void {
		this.hoverRect.kill()
	}

	public isSelectable(gameObject: Phaser.GameObjects.GameObject): gameObject is Selectable {
		return this.selectables.includes(gameObject as Selectable)
	}

	public onDragStart(gameObject: Selectable) {
		this.hoverEnabled = false
		this.hoverRect.kill()
	}

	public onDragEnd(gameObject: Selectable) {
		this.hoverEnabled = true
	}

	public cancelSelection() {
		this.selectedGameObject = null
		this.transformControls.kill()
	}

	public destroy(): void {
		this.destroyController.abort()
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
