import { IPatchesConfig, NinePatch } from '@koreez/phaser3-ninepatch'
import { proxy } from 'valtio'
import { CreateEditableObjectJson, EDITABLE_SYMBOL, IEditableObject } from './EditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'
import { ComponentsManager } from './components/base/ComponentsManager'
import { EditableComponentJson } from './components/base/EditableComponent'

export class EditableNineSlice extends NinePatch implements IEditableObject {
	public readonly [EDITABLE_SYMBOL] = true
	public readonly kind = 'NineSlice'
	public readonly id: string
	private _isLocked = false
	private _stateObj: EditableNineSliceJson
	private _stateChanges: StateChangesEmitter<EditableNineSliceJson>
	private _components: ComponentsManager

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

		this._components = new ComponentsManager(this)
		this._components.on('component-added', this.onComponentsListChanged, this)
		this._components.on('component-removed', this.onComponentsListChanged, this)
		this._components.on('component-moved', this.onComponentsListChanged, this)

		this._stateObj = proxy(this.toJson())

		// state changes are reflected in the underlying Phaser object
		this._stateChanges = new StateChangesEmitter(this._stateObj, {
			name: (value) => (this.name = value),
			visible: (value) => (this.visible = value),
			locked: (value) => (this._isLocked = value),
			angle: (value) => (this.angle = value),
			x: (value) => (this.x = value),
			y: (value) => (this.y = value),
			alpha: (value) => (this.alpha = value),
			tint: (value) => (this.tint = value),
			tintFill: (value) => (this.tintFill = value),

			// TODO implement frame and texture changes

			// nine slice specific properties
			width: (value) => this.resize(value, this.height),
			height: (value) => this.resize(this.width, value),
		})
	}

	private onComponentsListChanged(): void {
		this._stateObj.components = this._components.items.map((c) => c.state)
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
			originX: this.originX,
			originY: this.originY,
			locked: this.locked,
			tint: this.tint,
			tintFill: this.tintFill,
			width: this.width,
			height: this.height,
			// @ts-ignore
			ninePatchConfig: this.config as IPatchesConfig,
			angle: this.angle,
			// @ts-ignore
			textureKey: this.originTexture.key,
			// @ts-ignore
			frameKey: this.originFrame.name,
			components: this._components.items.map((c) => c.toJson()),
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

		this.withoutEmits((state) => {
			state.width = width
			state.height = height
		})

		return super.resize(width, height)
	}

	// #region displayWidth and displayHeight hacks
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

	// #endregion

	// @ts-expect-error
	get name(): string {
		return this._stateObj?.name || ''
	}

	set name(value: string) {
		if (this._stateObj) {
			this._stateObj.name = value
		}
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

	get stateObj() {
		return this._stateObj
	}

	override destroy(fromScene?: boolean): void {
		this._stateChanges.destroy()

		this._components.destroy()

		super.destroy(fromScene)
	}

	get components() {
		return this._components
	}
}

export type EditableNineSliceJson = CreateEditableObjectJson<{
	type: 'NineSlice'
	id: string
	depth: number
	blendMode: string | Phaser.BlendModes | number
	scale: { x: number; y: number }
	originX: number
	originY: number
	locked: boolean
	tint: number
	tintFill: boolean
	width: number
	height: number
	ninePatchConfig: IPatchesConfig
	angle: number
	components: EditableComponentJson[]
}>
