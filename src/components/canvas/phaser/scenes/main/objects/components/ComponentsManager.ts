import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { err, ok, Result } from 'neverthrow'
import { EditableObject } from '../EditableObject'
import { BaseEditableComponent } from './BaseEditableComponent'

type Events = {
	'component-added': (component: BaseEditableComponent) => void
	'component-removed': (component: BaseEditableComponent) => void
}

export class ComponentsManager extends TypedEventEmitter<Events> {
	private readonly _components = new Map<string, BaseEditableComponent>()

	constructor(private readonly parent: EditableObject) {
		super()
	}

	public get items(): ReadonlyArray<BaseEditableComponent> {
		return Array.from(this._components.values())
	}

	public add(comp: BaseEditableComponent): Result<{}, string> {
		if (this._components.has(comp.type)) {
			return err(`component ${comp.type} already exists`)
		}

		const result = comp.canBeAddedTo(this.parent)
		if (result.isErr()) {
			return result
		}

		comp.onAdded(this.parent)

		this._components.set(comp.type, comp)

		this.emit('component-added', comp)

		return ok({})
	}

	public remove(type: string): Result<{}, string> {
		const comp = this._components.get(type)
		if (!comp) {
			return err(`component ${type} does not exist`)
		}

		comp.onRemoved()

		this._components.delete(type)

		this.emit('component-removed', comp)

		return ok({})
	}

	public get(type: string): BaseEditableComponent | undefined {
		return this._components.get(type)
	}

	public destroy(): void {
		for (const comp of this._components.values()) {
			comp.destroy()
		}

		this._components.clear()
	}
}
