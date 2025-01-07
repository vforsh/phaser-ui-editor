import { CreateEditableObjectJson, CreateEditableObjectJsonBasic, EDITABLE_SYMBOL, IEditableObject } from './EditableObject'

export class EditableImage extends Phaser.GameObjects.Image implements IEditableObject {
	readonly [EDITABLE_SYMBOL] = true
	private _isLocked = false

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x, y, texture, frame)
	}

	toJson(): EditableImageJson {
		return {
			...this.toJSON(),
			type: 'Image',
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
		}
	}

	toJsonBasic(): EditableImageJsonBasic {
		return {
			type: 'Image',
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

export type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
}>

export type EditableImageJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'Image'
	name: string
	locked: boolean
	visible: boolean
}>
