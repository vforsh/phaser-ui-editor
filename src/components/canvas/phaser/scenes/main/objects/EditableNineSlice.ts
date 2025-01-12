import { IPatchesConfig, NinePatch } from '@koreez/phaser3-ninepatch'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	IEditableObject,
} from './EditableObject'
import { proxy, subscribe } from 'valtio'

export class EditableNineSlice extends NinePatch implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'NineSlice'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableNineSliceJson
	private _stateUnsub: () => void

	constructor(
		scene: Phaser.Scene,
		id: string,
		width: number,
		height: number,
		texture: string,
		frame?: string | number,
		ninePatchConfig?: IPatchesConfig
	) {
		super(scene, 0, 0, width, height, texture, frame, ninePatchConfig)

		this.id = id

		this._stateObj = proxy(this.toJson())

		this._stateUnsub = subscribe(this._stateObj, (ops) => {
			console.log(`${this.id} (${this.kind}) state changed`, ops)
		})
	}

	toJson(): EditableNineSliceJson {
		return {
			...this.toJSON(),
			id: this.id,
			type: 'NineSlice',
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
			tint: this.tint,
			tintFill: this.tintFill,
			width: this.width,
			height: this.height,
			// @ts-expect-error
			ninePatchConfig: this.config as IPatchesConfig,
		}
	}

	toJsonBasic(): EditableNineSliceJsonBasic {
		return {
			type: 'NineSlice',
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

	get isResizable(): boolean {
		return true
	}

	override resize(width: number, height: number) {
		if (this.input) {
			// TODO support different hitArea types, not just Rectangle
			this.input.hitArea?.setSize(width, height)
		}

		return super.resize(width, height)
	}

	// we override the displayWidth and displayHeight for selection and transform controls to work properly

	// @ts-expect-error
	get displayWidth(): number {
		return this.width
	}

	set displayWidth(value: number) {
		this.resize(value, this.height)
	}

	// @ts-expect-error
	get displayHeight(): number {
		return this.height
	}

	set displayHeight(value: number) {
		this.resize(this.width, value)
	}

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateUnsub()
		
		super.destroy(fromScene)
	}
}

export type EditableNineSliceJson = CreateEditableObjectJson<{
	type: 'NineSlice'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	tint: number
	tintFill: boolean
	width: number
	height: number
	ninePatchConfig: IPatchesConfig
}>

export type EditableNineSliceJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'NineSlice'
	name: string
	locked: boolean
	visible: boolean
}>
