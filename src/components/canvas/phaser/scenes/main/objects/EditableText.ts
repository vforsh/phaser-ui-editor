import { signalFromEvent } from '@components/canvas/phaser/robowhale/utils/events/create-abort-signal-from-event'
import { proxy } from 'valtio'
import { CreateEditableObjectJson, EDITABLE_SYMBOL, IEditableObject } from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

export class EditableText extends Phaser.GameObjects.Text implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Text'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableTextJson
	private _stateChanges: StateChangesEmitter<EditableTextJson>

	constructor(scene: Phaser.Scene, id: string, x: number, y: number, text: string, style: EditableTextStyleJson) {
		super(scene, x, y, text, style as Phaser.Types.GameObjects.Text.TextStyle)

		this.id = id

		const signal = signalFromEvent(this, 'destroy')

		this._stateObj = proxy(this.toJson())

		// state changes are reflected in the underlying Phaser object
		this._stateChanges = new StateChangesEmitter(
			this._stateObj,
			{
				'name': (value) => (this.name = value),
				'visible': (value) => (this.visible = value),
				'locked': (value) => (this._isLocked = value),
				'angle': (value) => (this.angle = value),
				'x': (value) => (this.x = value),
				'y': (value) => (this.y = value),
				'originX': (value) => this.setOrigin(value, this.originY),
				'originY': (value) => this.setOrigin(this.originX, value),
				'scale.x': (value) => (this.scaleX = value),
				'scale.y': (value) => (this.scaleY = value),
				'alpha': (value) => (this.alpha = value),
				'tint': (value) => (this.tint = value),
				'tintFill': (value) => (this.tintFill = value),
				'lineSpacing': (value) => this.setLineSpacing(value),
				'letterSpacing': (value) => this.setLetterSpacing(value),
				'text': (value) => (this.text = value),
				'wordWrapWidth': (value) => this.setWordWrapWidth(value),
				'wordWrapUseAdvanced': (value) => this.setWordWrapWidth(this.style.wordWrapWidth, value),
				'paddingX': (value) =>
					this.setPadding({
						left: value,
						right: value,
						top: this.padding.top || 0,
						bottom: this.padding.bottom || 0,
					}),
				'paddingY': (value) =>
					this.setPadding({
						left: this.padding.left || 0,
						right: this.padding.right || 0,
						top: value,
						bottom: value,
					}),
			},
			signal
		)

		new StateChangesEmitter(
			this._stateObj.style,
			{
				resolution: (value) => value && this.setResolution(value),
				align: (value) => value && this.setAlign(value),
				fontFamily: (value) => value && this.setFontFamily(value),
				fontSize: (value) => value && this.setFontSize(value),
				fontStyle: (value) => value && this.setFontStyle(value),
				backgroundColor: (value) => value && this.setBackgroundColor(value),
				color: (value) => value && this.setColor(value),
				// stroke
				stroke: (value) => value !== undefined && this.setStroke(value, this.style.strokeThickness),
				strokeThickness: (value) => value !== undefined && this.setStroke(this.style.stroke as string, value),
				// shadow
				shadowColor: (value) => value !== undefined && this.style.setShadowColor(value),
				shadowBlur: (value) => value !== undefined && this.style.setShadowBlur(value),
				shadowOffsetX: (v) => v !== undefined && this.style.setShadowOffset(v, this.style.shadowOffsetY),
				shadowOffsetY: (v) => v !== undefined && this.style.setShadowOffset(this.style.shadowOffsetX, v),
				shadowStroke: (value) => value !== undefined && this.style.setShadowStroke(value),
				shadowFill: (value) => value !== undefined && this.style.setShadowFill(value),
			},
			signal
		)
	}

	/**
	 * Use this method to change the state without applying these changes to the underlying Phaser object.
	 */
	private withoutEmits(fn: (state: this['stateObj']) => void): void {
		if (!this._stateObj || !this._stateChanges) return

		const prev = this._stateChanges.emitsEnabled
		this._stateChanges.emitsEnabled = false
		fn(this._stateObj)
		this._stateChanges.emitsEnabled = prev
	}

	toJson(): EditableTextJson {
		return {
			...this.toJSON(),
			id: this.id,
			type: 'Text',
			depth: this.depth,
			blendMode: this.blendMode,
			scale: {
				x: this.scaleX,
				y: this.scaleY,
			},
			originX: this.originX,
			originY: this.originY,
			locked: this.locked,
			text: this.text,
			style: this.style.toJSON() as EditableTextStyleJson,
			lineSpacing: this.lineSpacing,
			letterSpacing: this.letterSpacing,
			tint: this.tint,
			tintFill: this.tintFill,
			angle: this.angle,
			paddingX: this.padding.x || 0,
			paddingY: this.padding.y || 0,
			wordWrapWidth: this.style.wordWrapWidth || 0,
			wordWrapUseAdvanced: this.style.wordWrapUseAdvanced,
		}
	}

	set locked(value: boolean) {
		this._isLocked = value
	}

	get locked(): boolean {
		return this._isLocked
	}

	get isResizable() {
		return false
	}

	// @ts-expect-error
	get name(): string {
		return this._stateObj?.name || ''
	}

	set name(value: string) {
		if (this._stateObj) {
			this._stateObj.name = value
		}
	}

	override setDisplaySize(width: number, height: number): this {
		super.setDisplaySize(width, height)

		this.withoutEmits((state) => {
			state.scale.x = this.scaleX
			state.scale.y = this.scaleY
		})

		return this
	}

	override setOrigin(x?: number, y?: number): this {
		super.setOrigin(x, y)

		this.withoutEmits((state) => {
			state.originX = this.originX
			state.originY = this.originY
		})

		return this
	}

	override setPosition(x?: number, y?: number): this {
		super.setPosition(x, y)

		this.withoutEmits((state) => {
			state.x = x ?? this.x
			state.y = y ?? this.y
		})

		return this
	}

	override setAngle(angle: number): this {
		super.setAngle(angle)

		this.withoutEmits((state) => {
			state.angle = angle
		})

		return this
	}

	override setStroke(color: string, thickness: number): this {
		super.setStroke(color, thickness)

		this.withoutEmits((state) => {
			state.style.stroke = color
			state.style.strokeThickness = thickness
		})

		return this
	}

	override setShadow(
		offsetX: number,
		offsetY: number,
		color: string,
		blur: number,
		stroke: boolean,
		fill: boolean
	): this {
		super.setShadow(offsetX, offsetY, color, blur, stroke, fill)

		this.withoutEmits((state) => {
			state.style.shadowOffsetX = offsetX
			state.style.shadowOffsetY = offsetY
			state.style.shadowColor = color
			state.style.shadowBlur = blur
			state.style.shadowStroke = stroke
			state.style.shadowFill = fill
		})

		return this
	}

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateChanges.destroy()

		super.destroy(fromScene)
	}
}

export type EditableTextJson = CreateEditableObjectJson<{
	type: 'Text'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	originX: number
	originY: number
	locked: boolean
	text: string
	style: EditableTextStyleJson
	lineSpacing: number
	letterSpacing: number
	tint: number
	tintFill: boolean
	angle: number
	paddingX: number
	paddingY: number
	wordWrapWidth: number
	wordWrapUseAdvanced: boolean
}>

export type EditableTextStyleJson = Partial<{
	fontFamily: string
	fontSize: string
	fontStyle: string
	backgroundColor: string | null
	color: string
	stroke: string
	strokeThickness: number
	shadowOffsetX: number
	shadowOffsetY: number
	shadowColor: string
	shadowBlur: number
	shadowStroke: boolean
	shadowFill: boolean
	align: string
	maxLines: number
	fixedWidth: number
	fixedHeight: number
	resolution: number
	rtl: boolean
	testString: string
	baselineX: number
	baselineY: number
	wordWrapWidth: number | null
	wordWrapUseAdvanced: boolean
	metrics: {
		ascent: number
		descent: number
		fontSize: number
	}
}>
