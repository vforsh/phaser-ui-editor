import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { proxy } from 'valtio'

import { PrefabRuntimeMeta } from '../prefabs/prefabRuntimeMeta'
import { ComponentsManager } from './components/base/ComponentsManager'
import { EditableComponentJson } from './components/base/EditableComponent'
import { CreateEditableObjectJson, EDITABLE_SYMBOL, EditableObjectEvents, IEditableObject } from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

type Events = {
	// custom events
} & EditableObjectEvents

type CornerRadiusAdvanced = {
	tl: number
	tr: number
	br: number
	bl: number
}

type CornerRadius = {
	mode: 'simple' | 'advanced'
	simple: number
	advanced: CornerRadiusAdvanced
}

export type GraphicsShapeJson =
	| {
			type: 'rectangle'
			cornerRadius: CornerRadius
	  }
	| {
			type: 'ellipse'
	  }

export type GraphicsFillJson = {
	enabled: boolean
	color: number
	alpha: number
}

export type GraphicsStrokeJson = {
	enabled: boolean
	color: number
	alpha: number
	width: number
	lineJoin: 'miter' | 'bevel' | 'round'
	lineCap: 'butt' | 'square' | 'round'
	miterLimit: number
}

export class EditableGraphics extends Phaser.GameObjects.Graphics implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Graphics'
	public readonly id: string
	public localId: string | undefined
	public prefabMeta?: PrefabRuntimeMeta
	private _isLocked = false
	private _stateObj: EditableGraphicsJson
	private _stateChanges: StateChangesEmitter<EditableGraphicsJson>
	private _components: ComponentsManager
	private readonly __events = new TypedEventEmitter<Events>()
	private _width = 1
	private _height = 1

	constructor(
		scene: Phaser.Scene,
		id: string,
		x: number,
		y: number,
		width: number,
		height: number,
		shape: GraphicsShapeJson,
		fill: GraphicsFillJson,
		stroke: GraphicsStrokeJson,
	) {
		super(scene)
		this.id = id
		this.setPosition(x, y)
		this._width = width
		this._height = height
		this.applySize(width, height)

		// Phaser Graphics doesn't apply origin, but we keep it fixed for editor math
		this.setData('originX', 0.5)
		this.setData('originY', 0.5)
		this._components = new ComponentsManager(this)
		this._components.on('component-added', this.onComponentsListChanged, this)
		this._components.on('component-removed', this.onComponentsListChanged, this)
		this._components.on('component-moved', this.onComponentsListChanged, this)
		this._stateObj = proxy(this.toJsonWithShape(shape, fill, stroke))

		this._stateChanges = new StateChangesEmitter(this._stateObj, {
			'name': (value) => (this.name = value),
			'visible': (value) => (this.visible = value),
			'locked': (value) => (this._isLocked = value),
			'alpha': (value) => (this.alpha = value),
			'angle': (value) => (this.angle = value),
			'x': (value) => (this.x = value),
			'y': (value) => (this.y = value),
			'scale.x': (value) => {
				this.scaleX = value
				this.syncDisplaySizeState()
			},
			'scale.y': (value) => {
				this.scaleY = value
				this.syncDisplaySizeState()
			},
			'width': (value) => {
				this.applySize(value, this._height)
				this.syncDisplaySizeState()
				this.redraw()
				this.updateHitArea()
			},
			'height': (value) => {
				this.applySize(this._width, value)
				this.syncDisplaySizeState()
				this.redraw()
				this.updateHitArea()
			},
			'shape.type': () => {
				this.redraw()
				this.updateHitArea()
			},
			'shape.cornerRadius.mode': () => this.redraw(),
			'shape.cornerRadius.simple': () => this.redraw(),
			'shape.cornerRadius.advanced.tl': () => this.redraw(),
			'shape.cornerRadius.advanced.tr': () => this.redraw(),
			'shape.cornerRadius.advanced.br': () => this.redraw(),
			'shape.cornerRadius.advanced.bl': () => this.redraw(),
			'fill.enabled': () => this.redraw(),
			'fill.color': () => this.redraw(),
			'fill.alpha': () => this.redraw(),
			'stroke.enabled': () => this.redraw(),
			'stroke.color': () => this.redraw(),
			'stroke.alpha': () => this.redraw(),
			'stroke.width': () => this.redraw(),
			'stroke.lineJoin': () => this.redraw(),
			'stroke.lineCap': () => this.redraw(),
			'stroke.miterLimit': () => this.redraw(),
		})

		this.redraw()
		this.updateHitArea()
	}

	private onComponentsListChanged(): void {
		this._stateObj.components = this._components.items.map((c) => c.state)
	}

	private toJsonWithShape(shape: GraphicsShapeJson, fill: GraphicsFillJson, stroke: GraphicsStrokeJson): EditableGraphicsJson {
		return {
			...this.toJSON(),
			id: this.id,
			localId: this.localId,
			type: 'Graphics',
			depth: this.depth,
			blendMode: this.blendMode,
			scale: { x: this.scaleX, y: this.scaleY },
			locked: this.locked,
			angle: this.angle,
			originX: 0.5,
			originY: 0.5,
			width: this._width,
			height: this._height,
			displayWidth: this.displayWidth,
			displayHeight: this.displayHeight,
			shape,
			fill,
			stroke,
			components: this._components.items.map((c) => c.toJson()),
		}
	}

	/**
	 * Use this method to change the state without applying these changes to the underlying Phaser object.
	 */
	private withoutEmits(fn: (state: EditableGraphicsJson) => void): void {
		if (!this._stateObj || !this._stateChanges) return

		const prev = this._stateChanges.emitsEnabled
		this._stateChanges.emitsEnabled = false
		fn(this._stateObj)
		this._stateChanges.emitsEnabled = prev
	}

	private applySize(width: number, height: number): void {
		this._width = width
		this._height = height
	}

	private syncDisplaySizeState(): void {
		this.withoutEmits((state) => {
			state.displayWidth = this.displayWidth
			state.displayHeight = this.displayHeight
		})
	}

	public getShapeType(): GraphicsShapeJson['type'] {
		return this._stateObj.shape.type
	}

	private getRectangleCornerRadius() {
		const { cornerRadius } = this._stateObj.shape.type === 'rectangle' ? this._stateObj.shape : { cornerRadius: null }
		if (!cornerRadius) return 0
		if (cornerRadius.mode === 'simple') return cornerRadius.simple
		return {
			tl: cornerRadius.advanced.tl,
			tr: cornerRadius.advanced.tr,
			br: cornerRadius.advanced.br,
			bl: cornerRadius.advanced.bl,
		}
	}

	private updateHitArea(): void {
		if (!this.input) {
			return
		}

		const { hitArea, hitTest } = this.getHitArea()
		this.input.hitArea = hitArea
		this.input.hitAreaCallback = hitTest
	}

	private getHitArea(): { hitArea: Phaser.Geom.Rectangle | Phaser.Geom.Ellipse; hitTest: Phaser.Types.Input.HitAreaCallback } {
		const originX = this.originX
		const originY = this.originY
		if (this._stateObj.shape.type === 'ellipse') {
			const centerX = this._width * (0.5 - originX)
			const centerY = this._height * (0.5 - originY)
			const area = new Phaser.Geom.Ellipse(centerX, centerY, this._width, this._height)
			return { hitArea: area, hitTest: Phaser.Geom.Ellipse.Contains }
		}

		const left = -this._width * originX
		const top = -this._height * originY
		const area = new Phaser.Geom.Rectangle(left, top, this._width, this._height)
		return { hitArea: area, hitTest: Phaser.Geom.Rectangle.Contains }
	}

	private redraw(): void {
		this.clear()

		const { shape, fill, stroke } = this._stateObj
		const w = this._width
		const h = this._height
		const originX = this.originX
		const originY = this.originY
		const left = -w * originX
		const top = -h * originY
		const centerX = w * (0.5 - originX)
		const centerY = h * (0.5 - originY)

		if (fill.enabled) {
			this.fillStyle(fill.color, fill.alpha)
			if (shape.type === 'rectangle') {
				const radius = this.getRectangleCornerRadius()
				this.fillRoundedRect(left, top, w, h, radius as any)
			} else {
				this.fillEllipse(centerX, centerY, w, h)
			}
		}

		if (stroke.enabled) {
			this.lineStyle(stroke.width, stroke.color, stroke.alpha)
			const gfx = this as Phaser.GameObjects.Graphics & { lineJoin?: string; lineCap?: string; miterLimit?: number }
			gfx.lineJoin = stroke.lineJoin
			gfx.lineCap = stroke.lineCap
			gfx.miterLimit = stroke.miterLimit

			if (shape.type === 'rectangle') {
				const radius = this.getRectangleCornerRadius()
				this.strokeRoundedRect(left, top, w, h, radius as any)
			} else {
				this.strokeEllipse(centerX, centerY, w, h)
			}
		}
	}

	toJson(): EditableGraphicsJson {
		const shape = this._stateObj.shape
		const fill = this._stateObj.fill
		const stroke = this._stateObj.stroke

		const plainShape: GraphicsShapeJson =
			shape.type === 'rectangle'
				? {
						type: 'rectangle',
						cornerRadius: {
							mode: shape.cornerRadius.mode,
							simple: shape.cornerRadius.simple,
							advanced: {
								tl: shape.cornerRadius.advanced.tl,
								tr: shape.cornerRadius.advanced.tr,
								br: shape.cornerRadius.advanced.br,
								bl: shape.cornerRadius.advanced.bl,
							},
						},
					}
				: { type: 'ellipse' }

		const plainFill: GraphicsFillJson = {
			enabled: fill.enabled,
			color: fill.color,
			alpha: fill.alpha,
		}

		const plainStroke: GraphicsStrokeJson = {
			enabled: stroke.enabled,
			color: stroke.color,
			alpha: stroke.alpha,
			width: stroke.width,
			lineJoin: stroke.lineJoin,
			lineCap: stroke.lineCap,
			miterLimit: stroke.miterLimit,
		}

		return this.toJsonWithShape(plainShape, plainFill, plainStroke)
	}

	set locked(value: boolean) {
		this._isLocked = value
	}

	get locked(): boolean {
		return this._isLocked
	}

	get isResizable(): boolean {
		return true
	}

	get originX(): number {
		return (this.getData('originX') as number | undefined) ?? 0.5
	}

	get originY(): number {
		return (this.getData('originY') as number | undefined) ?? 0.5
	}

	get width(): number {
		return this._width
	}

	get height(): number {
		return this._height
	}

	override setName(value: string): this {
		super.setName(value)

		this.withoutEmits((state) => {
			state.name = value
		})

		return this
	}

	override setVisible(value: boolean): this {
		super.setVisible(value)

		this.withoutEmits((state) => {
			state.visible = value
		})

		return this
	}

	public setLocked(value: boolean): this {
		this._stateObj.locked = value
		return this
	}

	override setScale(x: number, y?: number): this {
		super.setScale(x, y)

		this.withoutEmits((state) => {
			state.scale.x = this.scaleX
			state.scale.y = this.scaleY
			state.displayWidth = this.displayWidth
			state.displayHeight = this.displayHeight
		})

		return this
	}

	override setAlpha(alpha: number): this {
		super.setAlpha(alpha)

		this.withoutEmits((state) => {
			state.alpha = alpha
		})

		return this
	}

	setDisplaySize(displayWidth: number, displayHeight: number): this {
		const nextWidth = this.scaleX === 0 ? this._width : Math.abs(displayWidth / this.scaleX)
		const nextHeight = this.scaleY === 0 ? this._height : Math.abs(displayHeight / this.scaleY)
		this.applySize(nextWidth, nextHeight)
		this.redraw()
		this.updateHitArea()

		this.withoutEmits((state) => {
			state.width = nextWidth
			state.height = nextHeight
			state.displayWidth = displayWidth
			state.displayHeight = displayHeight
		})

		return this
	}

	get displayWidth(): number {
		return Math.abs(this._width * this.scaleX)
	}

	set displayWidth(value: number) {
		if (this.scaleX === 0) return
		const nextWidth = Math.abs(value / this.scaleX)
		this.applySize(nextWidth, this._height)
		this.redraw()
		this.updateHitArea()
		this.withoutEmits((state) => {
			state.width = nextWidth
			state.displayWidth = value
		})
	}

	get displayHeight(): number {
		return Math.abs(this._height * this.scaleY)
	}

	set displayHeight(value: number) {
		if (this.scaleY === 0) return
		const nextHeight = Math.abs(value / this.scaleY)
		this.applySize(this._width, nextHeight)
		this.redraw()
		this.updateHitArea()
		this.withoutEmits((state) => {
			state.height = nextHeight
			state.displayHeight = value
		})
	}

	override setAngle(angle: number): this {
		super.setAngle(angle)

		this.withoutEmits((state) => {
			state.angle = angle
		})

		return this
	}

	override setX(x: number): this {
		super.setX(x)

		this.withoutEmits((state) => {
			state.x = x
		})

		return this
	}

	override setY(y: number): this {
		super.setY(y)

		this.withoutEmits((state) => {
			state.y = y
		})

		return this
	}

	override setPosition(x: number, y: number): this {
		super.setPosition(x, y)

		this.withoutEmits((state) => {
			state.x = x
			state.y = y
		})

		return this
	}

	public setAngleVisualOnly(angle: number): this {
		super.setAngle(angle)
		return this
	}

	public setPositionVisualOnly(x: number, y: number): this {
		super.setPosition(x, y)
		return this
	}

	public setSizeVisualOnly(width: number, height: number): this {
		this.applySize(width, height)
		this.redraw()
		this.updateHitArea()
		return this
	}

	public setDisplaySizeVisualOnly(displayWidth: number, displayHeight: number): this {
		const nextWidth = this.scaleX === 0 ? this._width : Math.abs(displayWidth / this.scaleX)
		const nextHeight = this.scaleY === 0 ? this._height : Math.abs(displayHeight / this.scaleY)
		this.applySize(nextWidth, nextHeight)
		this.redraw()
		this.updateHitArea()
		return this
	}

	public setOriginVisualOnly(x: number, y: number): this {
		return this
	}

	public getBounds(output?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
		const width = this.displayWidth
		const height = this.displayHeight
		const left = this.x - width * this.originX
		const top = this.y - height * this.originY
		if (output) {
			return output.setTo(left, top, width, height)
		}
		return new Phaser.Geom.Rectangle(left, top, width, height)
	}

	override setInteractive(hitArea?: any, hitAreaCallback?: any, dropZone?: boolean): this {
		if (!hitArea) {
			const computed = this.getHitArea()
			super.setInteractive(computed.hitArea, computed.hitTest, dropZone)
			return this
		}
		super.setInteractive(hitArea, hitAreaCallback, dropZone)
		return this
	}

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateChanges.destroy()
		this._components.destroy()
		super.destroy(fromScene)
		this.__events.destroy()
	}

	get components() {
		return this._components
	}

	public get events(): TypedEventEmitter<Events> {
		return this.__events
	}
}

export type EditableGraphicsJson = CreateEditableObjectJson<{
	type: 'Graphics'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	originX: number
	originY: number
	locked: boolean
	width: number
	height: number
	displayWidth: number
	displayHeight: number
	shape: GraphicsShapeJson
	fill: GraphicsFillJson
	stroke: GraphicsStrokeJson
	angle: number
	components: EditableComponentJson[]
}>
