import { JsonValue } from 'type-fest'
import { EditableObject } from '../IEditableObject'

export abstract class EditableComponent {
	public abstract readonly name: string
	protected _parent: EditableObject | undefined
	protected _isActive = true
	private _destroyController = new AbortController()

	public onAdded(parent: EditableObject): void {
		if (this._parent !== undefined) {
			throw new Error('Component already has a parent')
		}

		this._parent = parent
	}

	public onRemoved(): void {
		this.destroy()
	}

	public activate(): void {
		if (this._isActive) {
			return
		}

		this._isActive = true

		this.onActivate()
	}

	protected abstract onActivate(): void

	public deactivate(): void {
		if (this._isActive === false) {
			return
		}

		this._isActive = false

		this.onDeactivate()
	}

	protected abstract onDeactivate(): void

	public abstract toJson(): EditableObjectComponentJson

	public get parent(): EditableObject | undefined {
		return this._parent
	}

	public get destroySignal(): AbortSignal {
		return this._destroyController.signal
	}

	public destroy(): void {
		this._destroyController.abort()
		this._parent = undefined
	}
}

export type EditableObjectComponentJson = Record<string, JsonValue>
