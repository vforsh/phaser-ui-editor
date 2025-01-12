import { proxy, subscribe } from 'valtio'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	IEditableObject,
} from './EditableObject'

export class EditableBitmapText extends Phaser.GameObjects.BitmapText implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'BitmapText'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableBitmapTextJson
	private _stateUnsub: () => void
	
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

		this._stateUnsub = subscribe(this._stateObj, (ops) => {
			console.log(`${this.id} (${this.kind}) state changed`, ops)
		})
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
		}
	}

	toJsonBasic(): EditableBitmapTextJsonBasic {
		return {
			type: 'BitmapText',
			id: this.id,
			name: this.name,
			locked: this.locked,
			visible: this.visible,
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

	// @ts-expect-error
	get name(): string {
		return this._stateObj?.name || ''
	}
	
	set name(value: string) {
		if (this._stateObj) {
			this._stateObj.name = value
		}
	}

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateUnsub()
		
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
}>

export type EditableBitmapTextJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'BitmapText'
	name: string
	locked: boolean
	visible: boolean
}>
