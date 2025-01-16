import { proxy } from 'valtio'
import { CreateEditableObjectJson, EDITABLE_SYMBOL, IEditableObject } from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

export class EditableImage extends Phaser.GameObjects.Image implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'Image'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableImageJson
	private _stateChanges: StateChangesEmitter<EditableImageJson>

	constructor(scene: Phaser.Scene, id: string, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x, y, texture, frame)

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
		})
	}

	/**
	 * Use this method to change the state without applying these changes to the underlying Phaser object.
	 */
	private withoutEmits(fn: (state: EditableImageJson) => void): void {
		if (!this._stateObj || !this._stateChanges) return

		const prev = this._stateChanges.emitsEnabled
		this._stateChanges.emitsEnabled = false
		fn(this._stateObj)
		this._stateChanges.emitsEnabled = prev
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
			locked: this.locked,
			tint: this.tint,
			tintFill: this.tintFill,
			angle: this.angle,
		}
	}

	get locked(): boolean {
		return this._isLocked
	}

	get isResizable(): boolean {
		return true
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

	override setOrigin(x?: number, y?: number): this {
		super.setOrigin(x, y)

		this.withoutEmits((state) => {
			state['origin.x'] = this.originX
			state['origin.y'] = this.originY
		})

		return this
	}

	override setDisplayOrigin(x?: number, y?: number): this {
		super.setDisplayOrigin(x, y)

		this.withoutEmits((state) => {
			state['origin.x'] = this.originX
			state['origin.y'] = this.originY
		})

		return this
	}

	override setScale(x: number, y?: number): this {
		super.setScale(x, y)

		this.withoutEmits((state) => {
			state.scale.x = this.scaleX
			state.scale.y = this.scaleY
		})

		return this
	}

	override setDisplaySize(width: number, height: number): this {
		super.setDisplaySize(width, height)

		this.withoutEmits((state) => {
			state.scale.x = this.scaleX
			state.scale.y = this.scaleY
		})

		return this
	}

	override setAngle(angle: number): this {
		if (this._stateObj) {
			this._stateObj.angle = angle
		}

		return this
	}

	override setPosition(x?: number, y?: number): this {
		if (this._stateObj) {
			this._stateObj.x = x ?? this._stateObj.x
			this._stateObj.y = y ?? this._stateObj.y
		}

		return this
	}

	override setAlpha(alpha: number): this {
		super.setAlpha(alpha)

		this.withoutEmits((state) => {
			state.alpha = alpha
		})

		return this
	}

	override setTint(tint: number): this {
		if (this._stateObj) {
			this._stateObj.tint = tint
		}

		return this
	}

	public setTintFillCustom(tintFill: boolean): this {
		if (this._stateObj) {
			this._stateObj.tintFill = tintFill
		}

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

export type EditableImageJson = CreateEditableObjectJson<{
	type: 'Image'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	locked: boolean
	tint: number
	tintFill: boolean
	angle: number
}>
