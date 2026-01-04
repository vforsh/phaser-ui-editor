import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { err, ok, Result } from 'neverthrow'

import { EditableObject } from '../../EditableObject'
import { BaseEditableComponent } from './BaseEditableComponent'
import { EditableComponentType } from './EditableComponent'

type Events = {
	'component-added': (component: BaseEditableComponent) => void
	'component-removed': (component: BaseEditableComponent) => void
	'component-moved': (component: BaseEditableComponent, newIndex: number, oldIndex: number) => void
}

export type AddComponentResult = Result<{}, string>
export type RemoveComponentResult = Result<{}, string>
export type MoveComponentResult = Result<{}, string>

export class ComponentsManager extends TypedEventEmitter<Events> {
	private readonly _components: BaseEditableComponent[] = []

	constructor(private readonly parent: EditableObject) {
		super()
	}

	public get items(): ReadonlyArray<BaseEditableComponent> {
		return this._components.slice()
	}

	public add(comp: BaseEditableComponent): AddComponentResult {
		if (this._components.some((c) => c.type === comp.type)) {
			return err(`component '${comp.type}' already exists on ${this.parent.name} (id: ${this.parent.id})`)
		}

		const result = comp.canBeAddedTo(this.parent)
		if (result.isErr()) {
			return result
		}

		comp.onAdded(this.parent)

		this._components.push(comp)

		this.emit('component-added', comp)

		return ok({})
	}

	public remove(type: EditableComponentType): RemoveComponentResult {
		const index = this._components.findIndex((c) => c.type === type)
		if (index === -1) {
			return err(`component '${type}' does not exist on ${this.parent.name} (id: ${this.parent.id})`)
		}

		const comp = this._components[index]
		comp.onRemoved()

		this._components.splice(index, 1)

		this.emit('component-removed', comp)

		return ok({})
	}

	public moveUp(type: EditableComponentType): MoveComponentResult {
		const index = this._components.findIndex((c) => c.type === type)
		if (index === -1) {
			return err(`component '${type}' does not exist on ${this.parent.name} (id: ${this.parent.id})`)
		}

		if (index === 0) {
			return ok({})
		}

		const comp = this._components[index]
		this._components[index] = this._components[index - 1]
		this._components[index - 1] = comp

		this.emit('component-moved', comp, index - 1, index)

		return ok({})
	}

	public moveDown(type: EditableComponentType): MoveComponentResult {
		const index = this._components.findIndex((c) => c.type === type)
		if (index === -1) {
			return err(`component '${type}' does not exist on ${this.parent.name} (id: ${this.parent.id})`)
		}

		if (index === this._components.length - 1) {
			return ok({})
		}

		const comp = this._components[index]
		this._components[index] = this._components[index + 1]
		this._components[index + 1] = comp

		this.emit('component-moved', comp, index + 1, index)

		return ok({})
	}

	public deactivateAll(): void {
		for (const comp of this._components) {
			comp.deactivate()
		}
	}

	public get(type: EditableComponentType): BaseEditableComponent | undefined {
		return this._components.find((c) => c.type === type)
	}

	public destroy(): void {
		for (const comp of this._components) {
			comp.destroy()
		}

		this._components.length = 0
	}
}
