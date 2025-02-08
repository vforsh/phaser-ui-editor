import { err, ok, Result } from 'neverthrow'
import { proxy } from 'valtio/vanilla'
import { EditableObject } from '../EditableObject'
import { EditableComponentJson } from './EditableComponent'

/**
 * Pre-add checks are used to ensure that a component can be added to a parent object.
 */
type PreAddCheck = (parent: EditableObject) => Result<{}, string>

// TODO create PreAddCheckFactory that can create different kinds of checks
// - comp can be added to the specific type of parent (e.g. `Layout` comps can be added only to containers)
// - comp can be added only if there is no component of the specific type on the parent (e.g. `VerticalLayout` comp can be added only if there is no `HorizontalLayout` comp on the parent)
// - comp can be added only if there is already another component of the specific type on the parent

export abstract class BaseEditableComponent {
	public abstract readonly type: string
	protected _parent: EditableObject | undefined
	protected _isActive = true
	protected _state!: EditableComponentJson
	protected _preAddChecks: PreAddCheck[] = []
	private _destroyController = new AbortController()

	protected createState(): EditableComponentJson {
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

	public abstract toJson(): EditableComponentJson

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
