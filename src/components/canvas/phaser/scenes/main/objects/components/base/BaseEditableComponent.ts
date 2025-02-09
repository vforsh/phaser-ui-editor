import { err, ok, Result } from 'neverthrow'
import { proxy } from 'valtio/vanilla'
import { EditableObject } from '../../EditableObject'
import { EditableComponentJson } from './EditableComponent'
import { PreAddCheck, PreAddChecksFactory } from './PreAddChecksFactory'

export abstract class BaseEditableComponent<TJson extends EditableComponentJson = EditableComponentJson> {
	public abstract readonly type: string
	protected _parent: EditableObject | undefined
	protected _isActive = true
	protected _state!: TJson
	protected _preAddChecksFactory = new PreAddChecksFactory()
	protected _preAddChecks: PreAddCheck[] = []
	private _destroyController = new AbortController()

	protected createState(): TJson {
		return proxy(this.toJson())
	}

	public canBeAddedTo(parent: EditableObject): Result<{}, string> {
		if (this._parent !== undefined) {
			return err('component already has a parent')
		}

		for (const check of this._preAddChecks) {
			const result = check(parent)
			if (result.isErr()) {
				return result
			}
		}

		return ok({})
	}

	public onAdded(parent: EditableObject): void {
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

	public abstract toJson(): TJson

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

	public get state(): TJson {
		return this._state
	}
}
