import { proxy } from 'valtio'
import { CreateEditableObjectJson, EDITABLE_SYMBOL, IEditableObject } from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

export class EditableBitmapText extends Phaser.GameObjects.BitmapText implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'BitmapText'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableBitmapTextJson
	private _stateChanges: StateChangesEmitter<EditableBitmapTextJson>

	// it is set in the super constructor
	private _bounds!: Phaser.Types.GameObjects.BitmapText.BitmapTextSize

	constructor(
		scene: Phaser.Scene,
		id: string,
		font: string,
		text?: string | string[],
		size?: number,
		align?: number
	) {
		super(scene, 0, 0, font, text, size, align)

		this.id = id

		this._stateObj = proxy(this.toJson())

		// state changes are reflected in the underlying Phaser object
		this._stateChanges = new StateChangesEmitter(this._stateObj, {
			'name': (value) => (this.name = value),
			'visible': (value) => (this.visible = value),
			'locked': (value) => (this._isLocked = value),
			'angle': (value) => (this.angle = value),
			'x': (value) => (this.x = value),
			'y': (value) => (this.y = value),
			'origin.x': (value) => this.setOrigin(value, this.originY),
			'origin.y': (value) => this.setOrigin(this.originX, value),
			'scale.x': (value) => (this.scaleX = value),
			'scale.y': (value) => (this.scaleY = value),
			'alpha': (value) => (this.alpha = value),
			'tint': (value) => (this.tint = value),
			'tintFill': (value) => (this.tintFill = value),
			'frameKey': (value) => this.setFrame(value),

			// bitmap text specific properties
			'text': (value) => (this.text = value),
			'font': (value) => this.setFont(value),
			'fontSize': (value) => (this.fontSize = value),
			'align': (value) => (this.align = value),
			'maxWidth': (value) => (this.maxWidth = value),
			'letterSpacing': (value) => (this.letterSpacing = value),
			'lineSpacing': (value) => (this.lineSpacing = value),
		})
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

	toJson(): EditableBitmapTextJson {
		return {
			...this.toJSON(),
			id: this.id,
			type: 'BitmapText',
			depth: this.depth,
			blendMode: this.blendMode,
			scale: {
				x: this.scaleX,
				y: this.scaleY,
			},
			origin: {
				x: this.originX,
				y: this.originY,
			},
			locked: this.locked,
			text: this.text,
			font: this.font,
			fontSize: this.fontSize,
			align: this.align,
			maxWidth: this.maxWidth,
			letterSpacing: this.letterSpacing,
			lineSpacing: this.lineSpacing,
			tint: this.tint,
			tintFill: this.tintFill,
			angle: this.angle,
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

	/**
	 * @note copied from Phaser pull request
	 * @link https://github.com/phaserjs/phaser/pull/6623
	 */
	public setDisplaySize(displayWidth: number, displayHeight: number) {
		this.setScale(1, 1)
		this.getTextBounds(false)
		const scaleX = displayWidth / this.width
		const scaleY = displayHeight / this.height
		this.setScale(scaleX, scaleY)
		return this
	}

	// @ts-expect-error
	set displayWidth(value: number) {
		this.setScaleX(1)
		this.getTextBounds(false)
		const scale = value / this.width
		this.setScaleX(scale)
	}

	// @ts-expect-error
	set displayHeight(value: number) {
		this.setScaleY(1)
		this.getTextBounds(false)
		const scale = value / this.height
		this.setScaleY(scale)
	}

	get displayWidth(): number {
		return this.width
	}

	get displayHeight(): number {
		return this.height
	}

	private setScaleX(value: number) {
		this.setScale(value, this.scaleY)
	}

	private setScaleY(value: number) {
		this.setScale(this.scaleX, value)
	}

	/* override setName(value: string): this {
		super.setName(value)
		
		this.withoutEmits((state) => {
			state.name = value
		})
		
		return this
	}
	
	override setFontSize(value: number) {
		super.setFontSize(value)
		
		this.withoutEmits((state) => {
			state.fontSize = value
		})
		
		return this
	} */

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateChanges.destroy()

		super.destroy(fromScene)
	}
}

export type EditableBitmapTextJson = CreateEditableObjectJson<{
	type: 'BitmapText'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	text: string
	font: string
	fontSize: number
	align: number
	maxWidth: number
	letterSpacing: number
	lineSpacing: number
	tint: number
	tintFill: boolean
	angle: number
}>
