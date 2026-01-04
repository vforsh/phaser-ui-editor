import { err, ok, Result } from 'neverthrow'
import { proxy } from 'valtio/vanilla'

import { EditableObject } from '../../EditableObject'
import { EditableComponentJson } from './EditableComponent'
import { PreAddCheck, PreAddChecksFactory } from './PreAddChecksFactory'

export abstract class BaseEditableComponent<TJson extends EditableComponentJson = EditableComponentJson> {
	public abstract readonly type: string
	protected _id: string
	protected _obj: EditableObject | undefined
	protected _isActive = true
	protected _state!: TJson
	protected _preAddChecksFactory = new PreAddChecksFactory()
	protected _preAddChecks: PreAddCheck[] = []
	private _deactivateController: AbortController | undefined
	private _destroyController = new AbortController()

	constructor(id: string) {
		this._id = id
	}

	protected createState(): TJson {
		return proxy(this.toJson())
	}

	public canBeAddedTo(obj: EditableObject): Result<{}, string> {
		if (this._obj !== undefined) {
			return err('component already attached to another object')
		}

		for (const check of this._preAddChecks) {
			const result = check(obj)
			if (result.isErr()) {
				return result
			}
		}

		return ok({})
	}

	public onAdded(obj: EditableObject): void {
		this._obj = obj

		if (this._isActive) {
			this._deactivateController = new AbortController()
			this.onActivate(this._deactivateController.signal, true)
		}
	}

	public onRemoved(): void {
		this.destroy()
	}

	public activate(): void {
		if (this._isActive) {
			return
		}

		this._isActive = true

		this._deactivateController = new AbortController()

		this.onActivate(this._deactivateController.signal, false)
	}

	protected abstract onActivate(deactivateSignal: AbortSignal, firstTime: boolean): void

	public deactivate(): void {
		if (this._isActive === false) {
			return
		}

		this._isActive = false

		this._deactivateController?.abort()
		this._deactivateController = undefined

		this.onDeactivate()
	}

	protected abstract onDeactivate(): void

	public abstract toJson(): TJson

	public get obj(): EditableObject | undefined {
		return this._obj
	}

	public get destroySignal(): AbortSignal {
		return this._destroyController.signal
	}

	public destroy(): void {
		this._destroyController.abort()
		this._obj = undefined
	}

	public get state(): TJson {
		return this._state
	}

	public get id(): string {
		return this._id
	}
}
