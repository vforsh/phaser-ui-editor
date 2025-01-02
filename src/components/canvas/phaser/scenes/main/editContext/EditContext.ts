import { EventfulContainer } from '@components/canvas/phaser/robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { Logger } from 'tslog'
import { CloneOptions, isSerializableGameObject, SerializableGameObject } from '../factory/ObjectsFactory'
import { MainScene } from '../MainScene'
import { AdjustableRect } from './AdjustableRect'
import { Selection } from './Selection'
import { SelectionRect } from './SelectionRect'
import { calculateBounds, Transformable } from './Transformable'
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

type Events = {
	'container-added': (container: EventfulContainer) => void
	'container-removed': (container: EventfulContainer) => void
	'container-double-clicked': (container: EventfulContainer) => void
	'pre-destroy': () => void
}

export type EditContextOptions = {
	scene: MainScene
	logger: Logger<{}>
	target: EventfulContainer
}

/**
 * It auto-destroys itself when the target container is destroyed.
 *
 * DO NOT instantiate this class directly, use `EditContextsManager.add()` instead.
 */
export class EditContext extends TypedEventEmitter<Events> {
	private readonly options: EditContextOptions
	public readonly logger: Logger<{}>
	private readonly scene: MainScene
	public readonly target: EventfulContainer
	public selectables: Selectable[] = []
	public selected: Selection | null = null

	/**
	 * A map of container clicks.
	 * The key is the container, the value is the timestamp of the last click.
	 */
	private containerClicks = new Map<EventfulContainer, number>()

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

	private _active = false

	private destroyController = new AbortController()
	private debugGraphics: Phaser.GameObjects.Graphics | null = null

	constructor(options: EditContextOptions) {
		super()

		this.options = options
		this.logger = options.logger
		this.scene = options.scene

		this.target = options.target
		this.target.on('child-added', this.onChildAdded, this, this.destroySignal)
		this.target.on('child-removed', this.onChildRemoved, this, this.destroySignal)
		this.target.once('destroy', this.destroy, this, this.destroySignal)

		this.target.list.forEach((child) => {
			if (isSelectable(child)) {
				this.register(child)
			}
		})

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

	private onChildAdded(child: Phaser.GameObjects.GameObject) {
		if (isSelectable(child)) {
			this.register(child)
		}

		if (child instanceof EventfulContainer) {
			this.emit('container-added', child)
		}
	}

	private onChildRemoved(child: Phaser.GameObjects.GameObject) {
		if (isSelectable(child)) {
			this.unregister(child)
		}

		if (child instanceof EventfulContainer) {
			this.emit('container-removed', child)
		}
	}

	public setHoverMode(mode: HoverMode) {
		this.hoverMode = mode

		if (this.hoverMode === 'disabled') {
			this.hoverRects.forEach((hoverRect) => hoverRect.kill())
		}
	}

	private onSceneUpdate() {
		if (!this._active) {
			return
		}

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
			(object) => this.selectables.includes(object as any) && !this.selected?.includes(object as any)
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
		this.transformControls.on(
			'start-follow',
			() => this.target.bringToTop(this.transformControls),
			this,
			this.destroySignal
		)

		this.target.add(this.transformControls)
	}

	private addDebugGraphics() {
		// TODO remove later
		this.debugGraphics = this.scene.add.graphics()
		this.debugGraphics.fillStyle(0xff0000, 0.5)
		this.debugGraphics.fillRect(0, 0, 100, 100)
		this.debugGraphics.kill()
	}

	public register(gameObject: Selectable): void {
		if (shouldIgnoreObject(gameObject)) {
			return
		}

		if (this.selectables.includes(gameObject)) {
			this.logger.warn(`'${gameObject.name}' is already in the selection manager`)
			return
		}

		const signal = this.destroySignal

		gameObject.setInteractive()
		gameObject.on('pointerdown', this.onSelectablePointerDown.bind(this, gameObject), this, signal)
		gameObject.once('destroy', () => this.unregister(gameObject), this, signal)

		if (gameObject instanceof EventfulContainer) {
			this.containerClicks.set(gameObject, 0)
			gameObject.on('pointerdown', this.onContainerPointerDown.bind(this, gameObject), this, signal)
		}

		this.selectables.push(gameObject)

		if (!this._active) {
			gameObject.disableInteractive()
		}

		// this.logger.debug(`registered '${gameObject.name}' in '${this.name}' edit context`)
	}

	public unregister(gameObject: Selectable): void {
		if (shouldIgnoreObject(gameObject)) {
			return
		}

		if (!this.selectables.includes(gameObject)) {
			this.logger.warn(`'${gameObject.name}' is not in the selection manager`)
			return
		}

		gameObject.offByContext(this)
		gameObject.disableInteractive()

		if (gameObject instanceof EventfulContainer) {
			this.containerClicks.delete(gameObject)
		}

		this.selectables = this.selectables.filter((selectable) => selectable !== gameObject)

		// should this side effect be handled here?
		if (this.selected?.includes(gameObject)) {
			this.selected.remove(gameObject)
		}

		// this.logger.debug(`unregistered '${gameObject.name}' from '${this.name}' edit context`)
	}

	public isRegistered(gameObject: Phaser.GameObjects.GameObject): gameObject is Selectable {
		return this.selectables.includes(gameObject as Selectable)
	}

	private onContainerPointerDown(
		container: EventfulContainer,
		pointer: Phaser.Input.Pointer,
		x: number,
		y: number
	): void {
		// this.logger.debug(`container '${container.name}' clicked`)

		const now = Date.now()
		const lastClick = this.containerClicks.get(container)
		const msSinceLastClick = lastClick ? now - lastClick : Number.MAX_SAFE_INTEGER
		if (msSinceLastClick < 200) {
			this.logger.debug(`container '${container.name}' double clicked`)
			this.emit('container-double-clicked', container)
		}

		this.containerClicks.set(container, now)
	}

	private onSelectablePointerDown(gameObject: Selectable, pointer: Phaser.Input.Pointer, x: number, y: number): void {
		if (pointer.event.shiftKey) {
			// deselect the clicked object if it was selected
			if (this.selected && this.selected.includes(gameObject)) {
				this.selected.remove(gameObject)
				return
			}

			// add the clicked object to the selection (create a new selection if it doesn't exist)
			this.selected ? this.selected.add(gameObject) : (this.selected = this.createSelection([gameObject]))
		} else if (pointer.event.ctrlKey || pointer.event.metaKey) {
			if (!this.selected) {
				return
			}

			// if the clicked object is not in the selection, do nothing
			if (!this.selected.includes(gameObject)) {
				return
			}

			const serializableObjects = this.selected.objects.every((obj) => isSerializableGameObject(obj))
			if (!serializableObjects) {
				throw new Error(
					`copy failed: ${this.selected.objects.map((obj) => obj.name).join(', ')} are not serializable`
				)
			}

			const cloneOptions: CloneOptions = { addToScene: true }
			const clonedObjects = this.selected.objects.map((obj) => {
				const clone = this.scene.objectsFactory.clone(obj as SerializableGameObject, cloneOptions)
				this.register(clone)
				return clone
			})

			this.selected.destroy()
			this.selected = this.createSelection(clonedObjects)
		} else {
			// if the clicked object is already in the selection, do nothing
			if (this.selected?.includes(gameObject)) {
				return
			}

			if (this.selected) {
				this.selected.destroy()
			}

			// create a new selection with the clicked object
			this.selected = this.createSelection([gameObject])
		}

		this.transformControls.startFollow(this.selected)
	}

	public setSelection(selectables: Selectable[]): Selection {
		this.cancelSelection()
		this.selected = this.createSelection(selectables)
		this.transformControls.startFollow(this.selected)
		return this.selected
	}

	public createSelection(selectables: Selectable[]): Selection {
		selectables.forEach((selectable) => {
			if (!this.isRegistered(selectable)) {
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
		this.selected = null
		this.transformControls.stopFollow()
		this.subSelectionRects.forEach((rect) => {
			rect.kill()
			rect.setData('object', null)
		})
	}

	public onDragStart(selection: Selection) {
		this.setHoverMode('disabled')
	}

	public onDragEnd(selection: Selection) {
		this.setHoverMode('normal')
	}

	public cancelSelection() {
		if (this.selected) {
			this.selected.destroy()
			this.selected = null
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

		// this.updateTargetBounds()
	}
	
	public updateTargetBounds(): void {
		if (this.target.name === 'root') {
			return
		}

		const bounds = calculateBounds(this.selectables)
		this.target.setSize(bounds.width, bounds.height)
		// TODO update input hit area
		this.logger.debug(`updated bounds for '${this.name}': ${bounds.width}x${bounds.height}`)
		
		// TODO update target bounds on
		// - children list change
		// - children transform change (position, scale, rotation)
	}

	public destroy(): void {
		this.emit('pre-destroy')

		super.destroy()

		this.destroyController.abort()

		this.hoverRects.length = 0

		this.subSelectionRects.length = 0

		if (this.selected) {
			this.selected.destroy()
			this.selected = null
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
}

export function shouldIgnoreObject(gameObject: Phaser.GameObjects.GameObject): boolean {
	return gameObject instanceof AdjustableRect || gameObject instanceof TransformControls
}
