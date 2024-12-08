import { MainScene } from '../MainScene'
import { AdjustableRect } from './AdjustableRect'
import { Selection } from './Selection'
import { TransformControls } from './TransformControls'

export type Selectable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export class SelectionManager {
	private scene: MainScene
	private selectables: Selectable[] = []
	public selection: Selection | null = null
	private hoverRect!: AdjustableRect
	public transformControls!: TransformControls
	private hoverEnabled = true
	private destroyController = new AbortController()

	constructor(scene: MainScene) {
		this.scene = scene

		this.addHoverRect()
		this.addTransformControls()
	}

	private addHoverRect() {
		this.hoverRect = new AdjustableRect(this.scene, {
			thickness: 2,
			color: 0x0e99ff,
		})

		this.hoverRect.name = 'hover-rect'
		this.scene.add.existing(this.hoverRect)
	}

	private addTransformControls() {
		this.transformControls = new TransformControls(this.scene, {
			resizeBorders: {
				thickness: 2,
				color: 0x0c8ce8,
				hitAreaPadding: 10,
			},
			resizeKnobs: {
				fillSize: 16,
				fillColor: 0x0c8ce8,
				resolution: 2,
			},
			rotateKnobs: {
				radius: 30,
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

		if (this.selection?.has(gameObject)) {
			this.selection.remove(gameObject)
			if (this.selection.size === 0) {
				this.selection.destroy()
				this.selection = null
				this.transformControls.kill()
			}
		}
	}

	private onSelectablePointerDown(gameObject: Selectable, pointer: Phaser.Input.Pointer, x: number, y: number): void {
		if (pointer.event.shiftKey) {
			if (this.selection && this.selection.has(gameObject)) {
				this.selection.remove(gameObject)
				if (this.selection.isEmpty) {
					this.selection.destroy()
					this.selection = null
					this.transformControls.kill()
				}
				return
			}

			this.selection ??= new Selection([])
			this.selection.add(gameObject)
		} else {
			this.selection = new Selection([gameObject])
		}

		this.transformControls.startFollow(this.selection)
		this.transformControls.revive()
	}

	private onSelectablePointerOver(gameObject: Selectable): void {
		if (!this.hoverEnabled) {
			return
		}

		if (this.selection?.has(gameObject)) {
			return
		}

		this.hoverRect.adjustTo(gameObject)
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
		this.selection = null
		this.transformControls.stopFollow()
	}

	public destroy(): void {
		this.destroyController.abort()

		if (this.selection) {
			this.selection.destroy()
			this.selection = null
		}
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
