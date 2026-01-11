import type { EditableComponentJson } from '@tekton/runtime'

import { err } from 'neverthrow'

import type { EditableComponentsFactory } from '../objects/components/base/EditableComponentsFactory'
import type { EditableObjectsFactory } from '../objects/EditableObjectsFactory'
import type { MainSceneHistory } from './MainSceneHistory'

import { AddComponentResult, MoveComponentResult, RemoveComponentResult } from '../objects/components/base/ComponentsManager'
import { EditableComponentType } from '../objects/components/base/EditableComponent'

/**
 * Component operation payload targeting a single editable object.
 * Used by add/remove/reorder component operations.
 */
export type ComponentOpTarget = {
	componentType: EditableComponentType
	objectId: string
}

export type MainSceneComponentOpsOptions = {
	history: MainSceneHistory
	objectsFactory: EditableObjectsFactory
	componentsFactory: EditableComponentsFactory
}

export class MainSceneComponentOps {
	constructor(private options: MainSceneComponentOpsOptions) {}

	public addComponent(data: ComponentOpTarget): AddComponentResult {
		const before = this.options.history.isRestoring ? null : this.options.history.captureSnapshot()

		const obj = this.options.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const component = this.options.componentsFactory.create(data.componentType)
		if (!component) {
			return err(`failed to create component '${data.componentType}'`)
		}

		const result = obj.components.add(component)

		if (!before || result.isErr()) {
			return result
		}

		void this.options.history.push('Add component', before, this.options.history.captureSnapshot())
		return result
	}

	public removeComponent(data: ComponentOpTarget): RemoveComponentResult {
		const before = this.options.history.isRestoring ? null : this.options.history.captureSnapshot()

		const obj = this.options.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.remove(data.componentType)

		if (!before || result.isErr()) {
			return result
		}

		void this.options.history.push('Remove component', before, this.options.history.captureSnapshot())
		return result
	}

	public moveComponentUp(data: ComponentOpTarget): MoveComponentResult {
		const before = this.options.history.isRestoring ? null : this.options.history.captureSnapshot()

		const obj = this.options.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.moveUp(data.componentType)

		if (!before || result.isErr()) {
			return result
		}

		void this.options.history.push('Move component up', before, this.options.history.captureSnapshot())
		return result
	}

	public moveComponentDown(data: ComponentOpTarget): MoveComponentResult {
		const before = this.options.history.isRestoring ? null : this.options.history.captureSnapshot()

		const obj = this.options.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const result = obj.components.moveDown(data.componentType)

		if (!before || result.isErr()) {
			return result
		}

		void this.options.history.push('Move component down', before, this.options.history.captureSnapshot())
		return result
	}

	public pasteComponent(data: { componentData: EditableComponentJson; objectId: string }): AddComponentResult {
		const before = this.options.history.isRestoring ? null : this.options.history.captureSnapshot()

		const obj = this.options.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return err(`failed to find object with id '${data.objectId}'`)
		}

		const component = this.options.componentsFactory.fromJson(data.componentData)
		if (!component) {
			return err(`failed to create component '${data.componentData.type}'`)
		}

		const result = obj.components.add(component)

		if (!before || result.isErr()) {
			return result
		}

		void this.options.history.push('Paste component', before, this.options.history.captureSnapshot())
		return result
	}
}
