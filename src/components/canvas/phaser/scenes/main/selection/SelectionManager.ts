import { Logger } from 'tslog'
import { CloneOptions, isSerializableGameObject, SerializableGameObject } from '../factory/ObjectsFactory'
import { MainScene } from '../MainScene'
import { AdjustableRect } from './AdjustableRect'
import { Selection } from './Selection'
import { SelectionRect } from './SelectionRect'
import { Transformable } from './Transformable'
import { TransformControls } from './TransformControls'

export type Selectable = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container

export function isSelectable(gameObject: Phaser.GameObjects.GameObject): gameObject is Selectable {
	return (
		gameObject instanceof Phaser.GameObjects.Image ||
		gameObject instanceof Phaser.GameObjects.Sprite ||
		gameObject instanceof Phaser.GameObjects.Container
	)
}

type HoverMode = 'disabled' | 'normal' | 'selection-rect'

export type SelectionManagerOptions = {
	scene: MainScene
	logger: Logger<{}>
}

export class SelectionManager {
	private options: SelectionManagerOptions
	private scene: MainScene
	private logger: Logger<{}>
	public selectables: Selectable[] = []
	public selection: Selection | null = null

	/**
	 * Hover rects are used to visualize the hover state of selectables.
	 */
	private hoverRects!: AdjustableRect[]

	/**
	 * The current hover mode.
	 *
	 * - `normal`: Hover rects are displayed for all selectables under the pointer.
	 * - `selection-rect`: Hover rects are displayed for all selectables under the current selection rect.
	 * - `disabled`: Hover rects are hidden.
	 */
	private hoverMode: HoverMode = 'normal'

	/**
	 * Selection rect is used to visualize the selection while dragging.
	 */
	public selectionRect!: SelectionRect

	/**
	 * Sub-selection rects are used to visualize the selection of each object in the selection.
	 */
	private subSelectionRects!: AdjustableRect[]

	/**
	 * Transform controls are used to transform the selection (scale, rotate, etc.)
	 */
	public transformControls!: TransformControls
	private destroyController = new AbortController()
	private debugGraphics: Phaser.GameObjects.Graphics | null = null

	constructor(options: SelectionManagerOptions) {
		this.options = options
		this.scene = options.scene
		this.logger = options.logger

		this.addHoverRects()
		this.addSubSelectionRects()
		this.addSelectionRect()
		this.addTransformControls()
		this.addDebugGraphics()

		this.scene.events.on(
			Phaser.Scenes.Events.UPDATE,
			this.onSceneUpdate,
			this,
			AbortSignal.any([this.destroySignal])
		)
	}

	public setHoverMode(mode: HoverMode) {
		this.hoverMode = mode

		if (this.hoverMode === 'disabled') {
			this.hoverRects.forEach((hoverRect) => hoverRect.kill())
		}
	}

	private onSceneUpdate() {
		this.updateSubSelectionRects()
		this.processHover()
	}

	private updateSubSelectionRects() {
		this.subSelectionRects.forEach((rect) => {
			if (rect.active === false) {
				return
			}

			const object = rect.getData('object')
			if (object) {
				rect.adjustTo(object)
			}
		})
	}

	private processHover() {
		if (this.hoverMode === 'disabled') {
			return
		}

		if (this.hoverMode === 'normal') {
			this.processNormalHover()
		} else {
			this.processSelectionRectHover()
		}
	}

	private processNormalHover(): void {
		const pointer = this.scene.input.activePointer

		this.hoverRects.forEach((hoverRect) => hoverRect.kill())

		const objectsUnderPointer = this.scene.input.hitTestPointer(pointer).reverse()
		const selectableUnderPointer = objectsUnderPointer.find(
			(object) => this.selectables.includes(object as any) && !this.selection?.includes(object as any)
		) as Selectable | undefined
		if (!selectableUnderPointer) {
			return
		}

		const hoverRect = this.getOrCreateHoverRect()
		hoverRect.adjustTo(selectableUnderPointer)
		hoverRect.revive()
	}

	private processSelectionRectHover(): void {
		// TODO there are way too much allocations here, need to find a better solution
		const selectablesUnderSelectionRect = this.selectables.filter((selectable) => {
			const globalOrigin = selectable.getWorldPosition()
			const left = globalOrigin.x - selectable.displayWidth * selectable.originX
			const right = globalOrigin.x + selectable.displayWidth * selectable.originX
			const top = globalOrigin.y - selectable.displayHeight * selectable.originY
			const bottom = globalOrigin.y + selectable.displayHeight * selectable.originY

			const topLeft = new Phaser.Math.Vector2(left, top)
			const topRight = new Phaser.Math.Vector2(right, top)
			const bottomLeft = new Phaser.Math.Vector2(left, bottom)
			const bottomRight = new Phaser.Math.Vector2(right, bottom)
			const points = [topLeft, topRight, bottomLeft, bottomRight]

			// check if aabb intersects at first
			// if not, return false
			// if yes, continue with polygon intersection check

			// account for rotation
			const angle = Phaser.Math.DegToRad(selectable.angle)
			points.forEach((point) => {
				const dx = point.x - globalOrigin.x
				const dy = point.y - globalOrigin.y
				point.x = globalOrigin.x + (dx * Math.cos(angle) - dy * Math.sin(angle))
				point.y = globalOrigin.y + (dx * Math.sin(angle) + dy * Math.cos(angle))
			})

			// create a polygon from the points
			const polygon = new Phaser.Geom.Polygon(points)

			return this.doesPolygonIntersectsRect(polygon, this.selectionRect.bounds)
		})

		this.hoverRects.forEach((rect) => rect.kill())

		// display hover rects for selectables under selection rect
		selectablesUnderSelectionRect.forEach((selectable) => {
			const hoverRect = this.getOrCreateHoverRect()
			hoverRect.adjustTo(selectable)
			hoverRect.revive()
		})
	}

	private doesPolygonIntersectsRect(polygon: Phaser.Geom.Polygon, rect: Phaser.Geom.Rectangle): boolean {
		// First, check if any point of the polygon is inside the rectangle
		for (const point of polygon.points) {
			if (rect.contains(point.x, point.y)) {
				return true
			}
		}

		// Then, check if any point of the rectangle is inside the polygon
		const rectPoints = [
			new Phaser.Math.Vector2(rect.x, rect.y),
			new Phaser.Math.Vector2(rect.x + rect.width, rect.y),
			new Phaser.Math.Vector2(rect.x + rect.width, rect.y + rect.height),
			new Phaser.Math.Vector2(rect.x, rect.y + rect.height),
		]

		for (const point of rectPoints) {
			if (polygon.contains(point.x, point.y)) {
				return true
			}
		}

		// Finally, check if any line segment of the polygon intersects with any line segment of the rectangle
		const polygonLines = this.getPolygonLines(polygon)
		const rectLines = [
			new Phaser.Geom.Line(rect.x, rect.y, rect.x + rect.width, rect.y),
			new Phaser.Geom.Line(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height),
			new Phaser.Geom.Line(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height),
			new Phaser.Geom.Line(rect.x, rect.y + rect.height, rect.x, rect.y),
		]

		for (const polygonLine of polygonLines) {
			for (const rectLine of rectLines) {
				if (Phaser.Geom.Intersects.LineToLine(polygonLine, rectLine)) {
					return true
				}
			}
		}

		return false
	}

	private getPolygonLines(polygon: Phaser.Geom.Polygon): Phaser.Geom.Line[] {
		const lines: Phaser.Geom.Line[] = []
		const points = polygon.points

		for (let i = 0; i < points.length; i++) {
			const point1 = points[i]
			const point2 = points[(i + 1) % points.length]
			lines.push(new Phaser.Geom.Line(point1.x, point1.y, point2.x, point2.y))
		}

		return lines
	}

	private addHoverRects(amount = 3) {
		this.hoverRects = []

		for (let i = 0; i < amount; i++) {
			this.createHoverRect()
		}
	}

	private getOrCreateHoverRect(): AdjustableRect {
		const hoverRect = this.hoverRects.find((hoverRect) => hoverRect.active === false)
		if (hoverRect) {
			return hoverRect
		}

		return this.createHoverRect()
	}

	private createHoverRect(): AdjustableRect {
		const hoverRect = new AdjustableRect(this.scene, {
			thickness: 3,
			color: 0x0e99ff,
		})
		hoverRect.name = 'hover-rect'
		hoverRect.kill()

		this.hoverRects.push(hoverRect)
		this.scene.add.existing(hoverRect)

		return hoverRect
	}

	private addSubSelectionRects(amount = 3) {
		this.subSelectionRects = []

		for (let i = 0; i < amount; i++) {
			this.createSubSelectionRect()
		}
	}

	private getOrCreateSubSelectionRect(): AdjustableRect {
		const subSelectionRect = this.subSelectionRects.find((rect) => rect.active === false)
		if (subSelectionRect) {
			return subSelectionRect
		}

		return this.createSubSelectionRect()
	}

	private createSubSelectionRect(): AdjustableRect {
		const subSelectionRect = new AdjustableRect(this.scene, {
			thickness: 2,
			color: 0x0e99ff,
		})
		subSelectionRect.name = 'sub-selection-rect_' + (this.subSelectionRects.length + 1)
		subSelectionRect.kill()

		this.subSelectionRects.push(subSelectionRect)
		this.scene.add.existing(subSelectionRect)

		return subSelectionRect
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

	private addDebugGraphics() {
		// TODO remove later
		this.debugGraphics = this.scene.add.graphics()
		this.debugGraphics.fillStyle(0xff0000, 0.5)
		this.debugGraphics.fillRect(0, 0, 100, 100)
		this.debugGraphics.kill()
	}

	public addSelectable(go: Selectable): void {
		if (this.selectables.includes(go)) {
			return
		}

		const signal = this.scene.shutdownSignal

		go.setInteractive()
		go.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onSelectablePointerDown.bind(this, go), this, signal)
		go.once(Phaser.GameObjects.Events.DESTROY, () => this.removeSelectable(go), this, signal)

		this.selectables.push(go)
	}

	public removeSelectable(gameObject: Selectable): void {
		gameObject.offByContext(this)
		gameObject.removeInteractive()

		this.selectables = this.selectables.filter((selectable) => selectable !== gameObject)

		if (this.selection?.includes(gameObject)) {
			this.selection.remove(gameObject)
		}
	}

	public createSelection(selectables: Selectable[]): Selection {
		selectables.forEach((selectable) => {
			if (!this.isSelectable(selectable)) {
				throw new Error(`object should be added to selection manager before creating a selection`)
			}
		})

		const selection = new Selection(selectables)
		selection.on('changed', this.onSelectionChanged, this, this.destroySignal)
		selection.once('destroyed', this.onSelectionDestroyed, this, this.destroySignal)

		selection.objects.forEach((object) => {
			const subSelectionRect = this.getOrCreateSubSelectionRect()
			subSelectionRect.adjustTo(object)
			subSelectionRect.revive()
			subSelectionRect.setData('object', object)
		})

		return selection
	}

	private onSelectionChanged(type: 'add' | 'remove', object: Transformable): void {
		if (type === 'add') {
			const subSelectionRect = this.getOrCreateSubSelectionRect()
			subSelectionRect.adjustTo(object)
			subSelectionRect.revive()
			subSelectionRect.setData('object', object)
		} else {
			const subSelectionRect = this.subSelectionRects.find((rect) => rect.getData('object') === object)
			if (subSelectionRect) {
				subSelectionRect.kill()
				subSelectionRect.setData('object', null)
			}
		}
	}

	private onSelectionDestroyed(): void {
		this.selection = null
		this.transformControls.stopFollow()
		this.subSelectionRects.forEach((rect) => {
			rect.kill()
			rect.setData('object', null)
		})
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
		} else if (pointer.event.ctrlKey || pointer.event.metaKey) {
			if (!this.selection) {
				return
			}

			// if the clicked object is not in the selection, do nothing
			if (!this.selection.includes(gameObject)) {
				return
			}

			const serializableObjects = this.selection.objects.every((obj) => isSerializableGameObject(obj))
			if (!serializableObjects) {
				throw new Error(
					`copy failed: ${this.selection.objects.map((obj) => obj.name).join(', ')} are not serializable`
				)
			}

			const cloneOptions: CloneOptions = { addToScene: true }
			const clonedObjects = this.selection.objects.map((obj) => {
				const clone = this.scene.objectsFactory.clone(obj as SerializableGameObject, cloneOptions)
				this.addSelectable(clone)
				return clone
			})

			this.selection.destroy()
			this.selection = this.createSelection(clonedObjects)
		} else {
			// if the clicked object is already in the selection, do nothing
			if (this.selection?.includes(gameObject)) {
				return
			}

			if (this.selection) {
				this.selection.destroy()
			}

			// create a new selection with the clicked object
			this.selection = this.createSelection([gameObject])
		}

		this.transformControls.startFollow(this.selection)
		this.transformControls.revive()
	}

	public isSelectable(gameObject: Phaser.GameObjects.GameObject): gameObject is Selectable {
		return this.selectables.includes(gameObject as Selectable)
	}

	public onDragStart(selection: Selection) {
		this.setHoverMode('disabled')
	}

	public onDragEnd(selection: Selection) {
		this.setHoverMode('normal')
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

		this.hoverRects.length = 0

		if (this.selection) {
			this.selection.destroy()
			this.selection = null
		}
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
