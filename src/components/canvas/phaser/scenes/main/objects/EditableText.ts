import { proxy, subscribe } from 'valtio'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	IEditableObject,
} from './EditableObject'

export class EditableText extends Phaser.GameObjects.Text implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Text'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableTextJson
	private _stateUnsub: () => void

	constructor(scene: Phaser.Scene, id: string, x: number, y: number, text: string, style: EditableTextStyleJson) {
		super(scene, x, y, text, style as Phaser.Types.GameObjects.Text.TextStyle)

		this.id = id

		this._stateObj = proxy(this.toJson())

		this._stateUnsub = subscribe(this._stateObj, (ops) => {
			console.log(`${this.id} (${this.kind}) state changed`, ops)
		})
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
			origin: {
				x: this.originX,
				y: this.originY,
			},
			locked: this.locked,
			text: this.text,
			style: this.style.toJSON() as EditableTextStyleJson,
			letterSpacing: this.letterSpacing,
			tint: this.tint,
			tintFill: this.tintFill,
		}
	}

	toJsonBasic(): EditableTextJsonBasic {
		return {
			type: 'Text',
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

	get stateObj() {
		return this._stateObj
	}
}

export type EditableTextJson = CreateEditableObjectJson<{
	type: 'Text'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	text: string
	style: EditableTextStyleJson
	letterSpacing: number
	tint: number
	tintFill: boolean
}>

export type EditableTextJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'Text'
	name: string
	locked: boolean
	visible: boolean
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
