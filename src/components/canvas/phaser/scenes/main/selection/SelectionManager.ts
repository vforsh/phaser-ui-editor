import { MainScene } from '../MainScene'
import { AdjustableRect } from './AdjustableRect'
import { Selection } from './Selection'
import { SelectionRect } from './SelectionRect'
import { TransformControls } from './TransformControls'

export type Selectable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

type HoverMode = 'disabled' | 'normal' | 'selection-rect'

export class SelectionManager {
	private scene: MainScene
	public selectables: Selectable[] = []
	public selection: Selection | null = null
	// replace with AdjustableRect[]
	private hoverRect!: AdjustableRect
	public selectionRect!: SelectionRect
	public transformControls!: TransformControls
	// @deprecated use hoverMode instead
	private hoverEnabled = true
	private hoverMode: HoverMode = 'normal'
	private destroyController = new AbortController()

	constructor(scene: MainScene) {
		this.scene = scene

		this.addHoverRect()
		this.addSelectionRect()
		this.addTransformControls()

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate, this, AbortSignal.any([this.destroySignal]))
	}

	public setHoverMode(mode: HoverMode) {
		this.hoverMode = mode

		if (this.hoverMode === 'disabled') {
			this.hoverRect.kill()
		}
	}

	private onSceneUpdate() {
		this.processHover()
	}

	private processHover() {
		if (this.hoverMode === 'disabled') {
			return
		}

		if (this.hoverMode === 'normal') {
			// display single hover rect over selectable under the pointer
		} else {
			// display multiple hover rects over selectables under the selection rect
		}
	}

	private addHoverRect() {
		this.hoverRect = new AdjustableRect(this.scene, {
			thickness: 2,
			color: 0x0e99ff,
		})

		this.hoverRect.name = 'hover-rect'
		this.hoverRect.kill()

		this.scene.add.existing(this.hoverRect)
	}

	private addSelectionRect() {
		this.selectionRect = new SelectionRect(this.scene, {
			fillColor: 0x0e99ff,
			fillAlpha: 0.25,
			outlineThickness: 2,
			outlineColor: 0x0e99ff,
		})

		this.selectionRect.name = 'selection-rect'
		this.selectionRect.kill()

		this.scene.add.existing(this.selectionRect)
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
		go.once(Phaser.GameObjects.Events.DESTROY, () => this.removeSelectable(go), this, signal)

		this.selectables.push(go)
	}

	public removeSelectable(gameObject: Selectable): void {
		gameObject.removeByContext(this)
		gameObject.removeInteractive()

		this.selectables = this.selectables.filter((selectable) => selectable !== gameObject)

		if (this.selection?.includes(gameObject)) {
			this.selection.remove(gameObject)
		}
	}

	public createSelection(selectables: Selectable[]): Selection {
		const selection = new Selection(selectables)
		selection.once('destroyed', this.onSelectionDestroyed, this, this.destroySignal)

		return selection
	}

	private onSelectablePointerDown(gameObject: Selectable, pointer: Phaser.Input.Pointer, x: number, y: number): void {
		if (pointer.event.shiftKey) {
			// deselect the clicked object if it was selected
			if (this.selection && this.selection.includes(gameObject)) {
				this.selection.remove(gameObject)
				return
			}

			// add the clicked object to the selection (create a new selection if it doesn't exist)
			this.selection ? this.selection.add(gameObject) : (this.selection = this.createSelection([gameObject]))
		} else {
			// if the clicked object is already in the selection, do nothing
			if (this.selection?.includes(gameObject)) {
				return
			}

			// create a new selection with the clicked object
			this.selection = this.createSelection([gameObject])
		}

		this.transformControls.startFollow(this.selection)
		this.transformControls.revive()
	}

	private onSelectablePointerOver(gameObject: Selectable): void {
		if (!this.hoverEnabled) {
			return
		}

		if (this.selection?.includes(gameObject)) {
			return
		}

		this.hoverRect.adjustTo(gameObject)
		this.hoverRect.revive()
	}

	private onSelectablePointerOut(gameObject: Selectable): void {
		this.hoverRect.kill()
	}

	private onSelectionDestroyed(): void {
		this.selection = null
		this.transformControls.stopFollow()
	}

	public isSelectable(gameObject: Phaser.GameObjects.GameObject): gameObject is Selectable {
		return this.selectables.includes(gameObject as Selectable)
	}

	public onDragStart(selection: Selection) {
		this.hoverEnabled = false
		this.hoverRect.kill()
	}

	public onDragEnd(selection: Selection) {
		this.hoverEnabled = true
	}

	public cancelSelection() {
		if (this.selection) {
			this.selection.destroy()
			this.selection = null
		}

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
