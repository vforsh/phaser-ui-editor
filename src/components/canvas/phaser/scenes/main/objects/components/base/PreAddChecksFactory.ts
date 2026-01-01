import { err, ok, Result } from 'neverthrow'
import { EditableObject, EditableObjectType } from '../../EditableObject'
import { EditableComponentType } from './EditableComponent'

/**
 * Pre-add checks are used to ensure that a component can be added to a parent object.
 */
export type PreAddCheck = (parent: EditableObject) => Result<{}, string>

export class PreAddChecksFactory {
	constructor() {}

	/**
	 * Ensures the parent object is one of the allowed types before attaching the component.
	 */
	public requireObjectType(...allowedTypes: EditableObjectType[]): PreAddCheck {
		return (parent: EditableObject) => {
			if (!allowedTypes.includes(parent.type)) {
				return err(`object has type ${parent.type}, but expected one of: ${allowedTypes.join(', ')}`)
			}

			return ok({})
		}
	}

	/**
	 * Ensures the parent object does **not** already have any of the conflicting component types.
	 */
	public requireNoComponentOfType(...types: EditableComponentType[]): PreAddCheck {
		return (parent: EditableObject) => {
			const conflictingComponent = types.find((type) => parent.components.get(type))
			if (conflictingComponent) {
				return err(`object already has a '${conflictingComponent}' component`)
			}

			return ok({})
		}
	}

	/**
	 * Ensures the parent object already has a required component type before attaching this one.
	 */
	public requireComponentOfType(type: EditableComponentType): PreAddCheck {
		return (parent: EditableObject) => {
			if (!parent.components.get(type)) {
				return err(`object does not have a component of type ${type}`)
			}

			return ok({})
		}
	}
}
