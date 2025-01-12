import { IPatchesConfig, NinePatch } from '@koreez/phaser3-ninepatch'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	IEditableObject,
} from './EditableObject'

export class EditableNineSlice extends NinePatch implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'NineSlice'
	public readonly id: string
	private _isLocked = false

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
			// TODO: get from NinePatch
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
