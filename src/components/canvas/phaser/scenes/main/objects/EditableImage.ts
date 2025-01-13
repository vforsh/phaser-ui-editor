import { match, P } from 'ts-pattern'
import { proxy, subscribe } from 'valtio'
import {
	CreateEditableObjectJson,
	CreateEditableObjectJsonBasic,
	EDITABLE_SYMBOL,
	IEditableObject,
} from './EditableObject'
import { EditableObjectChangesEmitter } from './EditableObjectChangesEmitter'

export class EditableImage extends Phaser.GameObjects.Image implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Image'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableImageJson
	private _stateChanges: EditableObjectChangesEmitter<EditableImageJson>

	constructor(scene: Phaser.Scene, id: string, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x, y, texture, frame)

		this.id = id

		this._stateObj = proxy(this.toJson())

		this._stateChanges = new EditableObjectChangesEmitter(this._stateObj)
		this._stateChanges.on('visible', (value) => this.visible = value)
		this._stateChanges.on('locked', (value) => this.locked = value)
		this._stateChanges.on('x', (value) => this.x = value)
		this._stateChanges.on('y', (value) => this.y = value)
	}

	toJson(): EditableImageJson {
		return {
			...this.toJSON(),
			id: this.id,
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
			tint: this.tint,
			tintFill: this.tintFill,
			angle: this.angle,
		}
	}

	toJsonBasic(): EditableImageJsonBasic {
		return {
			type: 'Image',
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
		this._stateChanges.destroy()

		super.destroy(fromScene)
	}
}

export type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	origin: { x: number; y: number }
	locked: boolean
	tint: number
	tintFill: boolean
	angle: number
}>

export type EditableImageJsonBasic = CreateEditableObjectJsonBasic<{
	type: 'Image'
	name: string
	locked: boolean
	visible: boolean
}>
