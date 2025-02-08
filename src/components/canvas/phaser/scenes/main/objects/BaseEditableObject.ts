import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { proxy } from 'valtio/vanilla'
import { EDITABLE_SYMBOL, EditableObjectJson } from './IEditableObject'
import { StateChangesEmitter } from './StateChangesEmitter'

type Events = {
	'pre-destroy': () => void
	'destroy': () => void
}

export abstract class BaseEditableObject extends TypedEventEmitter<Events> {
	/* [EDITABLE_SYMBOL]: true

	// we use 'kind' because 'type' is already used by Phaser
	get kind(): string

	get id(): string

	set locked(value: boolean)
	get locked(): boolean
	set visible(value: boolean)
	get visible(): boolean

	// can change displayWidth and displayHeight for this object
	get isResizable(): boolean

	toJson(): EditableObjectJson

	get stateObj(): EditableObjectJson

	// addComponent(component: EditableObjectComponent): void
	// removeComponent(component: EditableObjectComponent): void
	// getComponent<T extends typeof EditableObjectComponent>(component: T): InstanceType<T> */

	public readonly [EDITABLE_SYMBOL] = true

	public readonly id: string
	public readonly view: Phaser.GameObjects.GameObject
	public readonly state!: EditableObjectJson
	protected stateChanges!: StateChangesEmitter<EditableObjectJson>
	protected readonly _preDestroyController = new AbortController()
	protected _locked = false

	constructor(id: string, view: Phaser.GameObjects.GameObject) {
		super()

		this.id = id

		this.view = view
		this.view.setData('editable', this)

		this._preDestroyController = new AbortController()
	}

	protected createState(): EditableObjectJson {
		return proxy(this.toJson())
	}

	/**
	 * Use this method to change the state without triggering `stateChanges` callbacks.
	 */
	protected withoutEmits(fn: (state: this['state']) => void): void {
		if (!this.stateChanges) return

		const prev = this.stateChanges.emitsEnabled
		this.stateChanges.emitsEnabled = false
		fn(this.state)
		this.stateChanges.emitsEnabled = prev
	}

	public get locked(): boolean {
		return this._locked
	}

	public set locked(value: boolean) {
		if (this._locked === value) {
			return
		}

		this._locked = value
		this.state.locked = value
	}

	// TODO rename to `type`
	abstract get kind(): string

	abstract get visible(): boolean
	abstract set visible(value: boolean)

	abstract get isResizable(): boolean

	abstract toJson(): EditableObjectJson

	public destroy(): void {
		this.emit('pre-destroy')

		this._preDestroyController.abort()

		super.destroy()

		this.stateChanges.destroy()

		this.view.destroy()

		this.emit('destroy')
	}

	public get preDestroySignal(): AbortSignal {
		return this._preDestroyController.signal
	}
}

export function getEditable(obj: Phaser.GameObjects.GameObject): BaseEditableObject | undefined {
	return obj.getData('editable') as BaseEditableObject | undefined
}
