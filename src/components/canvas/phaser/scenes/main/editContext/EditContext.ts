import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { ILogObj, Logger } from 'tslog'
import { MainScene } from '../MainScene'
import { EditableContainer } from '../objects/EditableContainer'
import { EditableObject, isEditable } from '../objects/EditableObject'
import { AdjustableRect } from './AdjustableRect'
import { Selection } from './Selection'
import { SelectionRect } from './SelectionRect'
import { calculateBounds } from './Transformable'
import { TransformControls } from './TransformControls'

type HoverMode = 'disabled' | 'normal' | 'selection-rect'

type Events = {
	'container-added': (container: EditableContainer) => void
	'container-removed': (container: EditableContainer) => void
	'container-double-clicked': (container: EditableContainer) => void
	'selection-changed': (selection: Selection | null) => void
	'pre-destroy': () => void
}

export type EditContextOptions = {
	scene: MainScene
	logger: Logger<ILogObj>
	target: EditableContainer
	isRoot: boolean
}

/**
 * It auto-destroys itself when the target container is destroyed.
 *
 * DO NOT instantiate this class directly, use `EditContextsManager.add()` instead.
 */
export class EditContext extends TypedEventEmitter<Events> {
	private readonly options: EditContextOptions
	public readonly logger: Logger<ILogObj>
	private readonly scene: MainScene
	public readonly target: EditableContainer
	public selectables: EditableObject[] = []
	public selection: Selection | null = null

	/**
	 * A map of container click timestamps.
	 * The key is the container, the value is the timestamp of the last click.
	 */
	private containerClicks = new Map<EditableContainer, number>()

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
	public objectsUnderSelectionRect: EditableObject[] = []

	/**
	 * Whether the edit context is active.
	 * Active means that the context is currently being used to edit the target container.
	 */
	private _active = false

	private readonly _isRoot: boolean

	constructor(options: EditContextOptions) {
		super()

		if (!options.target.name) {
			throw new Error(`target container must have a name`)
		}

		this.options = options
		this.logger = options.logger
		this.scene = options.scene
		this._isRoot = options.isRoot

		this.target = options.target
		this.target.events.on('editable-added', this.onChildAdded, this, this.destroySignal)
		this.target.events.on('editable-removed', this.onChildRemoved, this, this.destroySignal)
		this.target.once('destroy', this.destroy, this, this.destroySignal)

		this.logger.debug(`create start ${this.target.listAsString()}`)

		this.target.editables.forEach((child) => {
			this.register(child)
		})

		this.addHoverRects(1)
		this.addSubSelectionRects(1)
		this.addSelectionRect()
		this.addTransformControls()
		// this.addDebugGraphics()

		this.logger.debug(`create complete ${this.target.listAsString()}`)
	}

	/**
	 * Keep the children in the correct order.
	 * The transform controls must be on top of everything else.
	 */
	private sortChildren(): void {
		this.hoverRects.forEach((rect) => this.target.bringToTop(rect))
		this.subSelectionRects.forEach((rect) => this.target.bringToTop(rect))
		this.target.bringToTop(this.transformControls)
	}

	private onChildAdded(child: EditableObject) {
		this.register(child)

		if (child instanceof EditableContainer) {
			// emit event so context manager will create a new edit context for the container
			this.emit('container-added', child)
		}

		this.sortChildren()
	}

	private onChildRemoved(child: EditableObject) {
		this.unregister(child)

		// TODO prune sub-selection rects

		if (child instanceof EditableContainer) {
			// emit event so context manager will remove the edit context for the container
			this.emit('container-removed', child)
		}
	}

	public setHoverMode(mode: HoverMode) {
		this.hoverMode = mode

		if (this.hoverMode === 'disabled') {
			this.hoverRects.forEach((hoverRect) => hoverRect.kill())
		}
	}

	/**
	 * Called by the edit context manager only for active contexts.
	 */
	public update(deltaMs: number): void {
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

		// TODO get rid of the type assertion
		const selectableUnderPointer = objectsUnderPointer.find(
			(object) => this.selectables.includes(object as any) && !this.selection?.includes(object as any)
		) as EditableObject | undefined
		if (!selectableUnderPointer) {
			return
		}

		const hoverRect = this.getOrCreateHoverRect()
		hoverRect.adjustTo(selectableUnderPointer)
		hoverRect.revive()
	}

	private processSelectionRectHover(): void {
		// TODO there are way too much allocations here, need to find a better solution
		this.objectsUnderSelectionRect = this.selectables.filter((selectable) => {
			const globalOrigin = selectable.getWorldPosition()
			const left = globalOrigin.x - selectable.displayWidth * selectable.originX
			const right = globalOrigin.x + selectable.displayWidth * (1 - selectable.originX)
			const top = globalOrigin.y - selectable.displayHeight * selectable.originY
			const bottom = globalOrigin.y + selectable.displayHeight * (1 - selectable.originY)

			const topLeft = new Phaser.Math.Vector2(left, top)
			const topRight = new Phaser.Math.Vector2(right, top)
			const bottomLeft = new Phaser.Math.Vector2(left, bottom)
			const bottomRight = new Phaser.Math.Vector2(right, bottom)
			const points = [topLeft, topRight, bottomRight, bottomLeft]

			// TODO check if aabb intersects at first
			// if not, return false
			// if yes, continue with polygon intersection check

			// account for rotation
			const angleRad = selectable.rotation
			points.forEach((point) => {
				const dx = point.x - globalOrigin.x
				const dy = point.y - globalOrigin.y
				point.x = globalOrigin.x + (dx * Math.cos(angleRad) - dy * Math.sin(angleRad))
				point.y = globalOrigin.y + (dx * Math.sin(angleRad) + dy * Math.cos(angleRad))
			})

			// create a polygon from the points
			const polygon = new Phaser.Geom.Polygon(points)

			return this.doesPolygonIntersectsRect(polygon, this.selectionRect.bounds)
		})

		this.hoverRects.forEach((rect) => rect.kill())

		// display hover rects for selectables under selection rect
		this.objectsUnderSelectionRect.forEach((selectable) => {
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
		hoverRect.name = 'hover-rect_' + (this.hoverRects.length + 1)
		hoverRect.kill()

		this.hoverRects.push(hoverRect)
		this.target.add(hoverRect)

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
		this.target.add(subSelectionRect)

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
			logger: this.logger.getSubLogger({ name: ':transform' }),
			originKnob: {
				radius: 8,
				lineThickness: 4,
				lineColor: 0x0c8ce8,
				resolution: 1,
			},
			resizeBorders: {
				thickness: 2,
				color: 0x0c8ce8,
				hitAreaPadding: 16,
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

		this.transformControls.events.on(
			'start-follow',
			(selection: Selection) => {
				this.target.bringToTop(this.transformControls)
				// this.logger.debug(`transform controls started following '${selection.objectsAsString}'`)
			},
			this,
			this.destroySignal
		)

		this.transformControls.events.on(
			'stop-follow',
			(selectionContent: string) => {
				// this.logger.debug(`transform controls stopped following '${selectionContent}'`)
			},
			this,
			this.destroySignal
		)

		this.transformControls.events.on(
			'transform-start',
			(type) => {
				this.setHoverMode('disabled')
				this.scene.startTransformControlsUndo(type)
			},
			this,
			this.destroySignal
		)

		this.transformControls.events.on(
			'transform-end',
			(type) => {
				this.setHoverMode('normal')
				this.scene.stopTransformControlsUndo()
			},
			this,
			this.destroySignal
		)

		this.transformControls.name = 'transform-controls'
		this.transformControls.kill()

		this.target.add(this.transformControls)
	}

	private addDebugGraphics() {
		this.debugGraphics = this.scene.add.graphics()
		this.debugGraphics.setName('debug-graphics')
		this.debugGraphics.fillStyle(0xff0000, 0.5)
		this.debugGraphics.fillRect(0, 0, 100, 100)
		this.debugGraphics.kill()
	}

	private register(obj: EditableObject): void {
		if (obj.parentContainer !== this.target) {
			throw new Error(`'${obj.name}' must be a child of '${this.target.name}'`)
		}

		if (this.selectables.includes(obj)) {
			this.logger.warn(`'${obj.name}' is already registered in this context`)
			return
		}

		const signal = this.destroySignal

		obj.setInteractive()
		obj.on('pointerdown', this.onEditableClick.bind(this, obj), this, signal)
		obj.once('destroy', () => this.unregister(obj), this, signal)

		if (obj instanceof EditableContainer) {
			this.containerClicks.set(obj, 0)
			obj.on('pointerdown', this.onContainerPointerDown.bind(this, obj), this, signal)
		}

		this.selectables.push(obj)

		if (!this._active) {
			obj.disableInteractive()
		}

		this.logger.debug(`registered item '${obj.name}'`)
	}

	private unregister(obj: EditableObject): void {
		if (!this.selectables.includes(obj)) {
			this.logger.warn(`'${obj.name}' is not registered in this context`)
			return
		}

		obj.offByContext(this)
		obj.disableInteractive()

		if (obj instanceof EditableContainer) {
			this.containerClicks.delete(obj)
		}

		this.selectables = this.selectables.filter((selectable) => selectable !== obj)

		// should this side effect be handled here?
		if (this.selection?.includes(obj)) {
			this.selection.remove(obj)
		}

		this.logger.debug(`unregistered item '${obj.name}'`)
	}

	public isRegistered(gameObject: Phaser.GameObjects.GameObject): gameObject is EditableObject {
		return isEditable(gameObject) && this.selectables.includes(gameObject)
	}

	private onContainerPointerDown(
		container: EditableContainer,
		pointer: Phaser.Input.Pointer,
		x: number,
		y: number
	): void {
		const now = Date.now()
		const lastClick = this.containerClicks.get(container)
		const msSinceLastClick = lastClick ? now - lastClick : Number.MAX_SAFE_INTEGER
		if (msSinceLastClick < 200) {
			this.logger.debug(`container '${container.name}' double clicked`)
			this.emit('container-double-clicked', container)
		}

		this.containerClicks.set(container, now)
	}

	private onEditableClick(gameObject: EditableObject, pointer: Phaser.Input.Pointer, x: number, y: number): void {
		if (pointer.event.shiftKey) {
			// deselect the clicked object if it was selected
			if (this.selection && this.selection.includes(gameObject)) {
				this.selection.remove(gameObject)
				return
			}

			// add the clicked object to the selection (create a new selection if it doesn't exist)
			this.selection ? this.selection.add(gameObject) : (this.selection = this.createSelection([gameObject]))
		} else if (pointer.event.ctrlKey || pointer.event.metaKey) {
			const toClone = this.selection?.includes(gameObject) ? this.selection.objects : [gameObject]
			const clonedObjects = toClone.map((obj) => {
				const clone = this.scene.objectsFactory.clone(obj, { addToScene: false })
				this.target.add(clone) // it will trigger `register()` as well
				return clone
			})

			this.selection = this.setSelection(clonedObjects)
			this.scene.startSelectionDrag(this.selection, pointer, this)
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
	}

	public setSelection(selectables: EditableObject[]): Selection {
		this.cancelSelection()
		this.selection = this.createSelection(selectables)
		this.transformControls.startFollow(this.selection)
		return this.selection
	}

	public addToSelection(selectables: EditableObject[]): void {
		if (this.selection) {
			for (const obj of selectables) {
				this.selection.add(obj)
			}
		} else {
			this.selection = this.createSelection(selectables)
		}
	}

	public removeFromSelection(selectables: EditableObject[]): void {
		if (this.selection) {
			for (const obj of selectables) {
				this.selection.remove(obj)
			}
		}
	}

	public createSelection(objs: EditableObject[]): Selection {
		objs.forEach((obj) => {
			const objName = obj.name
			if (!this.isRegistered(obj)) {
				throw new Error(`object '${objName}' is not registered in this context`)
			}
		})

		const selection = new Selection(this.target, objs)
		selection.on('changed', this.onSelectionChanged, this, this.destroySignal)
		selection.once('destroyed', this.onSelectionDestroyed, this, this.destroySignal)

		selection.objects.forEach((object) => {
			const subSelectionRect = this.getOrCreateSubSelectionRect()
			subSelectionRect.adjustTo(object)
			subSelectionRect.revive()
			subSelectionRect.setData('object', object)
		})

		this.emit('selection-changed', selection)

		return selection
	}

	private onSelectionChanged(type: 'add' | 'remove', object: EditableObject): void {
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

		this.emit('selection-changed', this.selection)
	}

	private onSelectionDestroyed(): void {
		this.selection = null
		this.transformControls.stopFollow()
		this.subSelectionRects.forEach((rect) => {
			rect.kill()
			rect.setData('object', null)
		})

		this.emit('selection-changed', this.selection)
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

	/**
	 * Called when switched to this edit context.
	 */
	public onEnter(): void {
		if (this._active) {
			return
		}

		this._active = true

		this.selectables.forEach((selectable) => {
			selectable.setInteractive()
		})
	}

	/**
	 * Called when switched to a different edit context.
	 */
	public onExit(): void {
		if (!this._active) {
			return
		}

		this._active = false

		this.cancelSelection()

		this.selectables.forEach((selectable) => {
			selectable.disableInteractive()
		})
	}

	/**
	 * Called when the edit context is added to the contexts manager.
	 */
	public onAdd(): void {}

	/**
	 * Called when the edit context is removed from the contexts manager.
	 */
	public onRemove() {}

	public getBounds(): Phaser.Geom.Rectangle {
		return calculateBounds(this.selectables)
	}

	public destroy(): void {
		this.emit('pre-destroy')

		super.destroy()

		this.destroyController.abort()

		this.objectsUnderSelectionRect.length = 0

		this.hoverRects.length = 0

		this.subSelectionRects.length = 0

		if (this.selection) {
			this.selection.destroy()
			this.selection = null
		}

		this.containerClicks.clear()
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}

	public get active(): boolean {
		return this._active
	}

	public get name(): string {
		return this.target.name
	}

	public set name(name: string) {
		const previousName = this.name
		this.target.name = name
		this.logger.settings.name = `:${name}`
		this.logger.debug(`name changed '${previousName}' -> '${name}'`)
	}

	public get isRoot() {
		return this._isRoot
	}
}
