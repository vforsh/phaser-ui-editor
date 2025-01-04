import { match } from 'ts-pattern'
import { EditableContainer, EditableContainerJson } from './EditableContainer'
import { EditableImage, EditableImageJson } from './EditableImage'

export interface IEditableObject {
	toJson(): EditableObjectJson
	// static fromJson(json: EditableObjectJson, scene: Phaser.Scene): EditableObject
}

export type CreateEditableObjectJson<T extends { type: string }> = Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson = EditableContainerJson | EditableImageJson

export type EditableObjectJsonType = EditableObjectJson['type']

const EDITABLE_CLASSES = [EditableContainer, EditableImage]

export type EditableObjectClass = (typeof EDITABLE_CLASSES)[number]

export type EditableObject = InstanceType<EditableObjectClass>

export function isEditable(obj: Phaser.GameObjects.GameObject): obj is EditableObject {
	return EDITABLE_CLASSES.some((cls) => obj instanceof cls)
}

export function getEditableObjectClass(jsonType: EditableObjectJsonType): EditableObjectClass {
	return match(jsonType)
		.returnType<EditableObjectClass>()
		.with('Container', () => EditableContainer)
		.with('Image', () => EditableImage)
		.exhaustive()
}
