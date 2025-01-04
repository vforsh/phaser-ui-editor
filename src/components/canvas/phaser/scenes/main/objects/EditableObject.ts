import type { EditableContainer, EditableContainerJson } from './EditableContainer'
import type { EditableImage, EditableImageJson } from './EditableImage'

export interface IEditableObject {
	toJson(): EditableObjectJson
	// static fromJson(json: EditableObjectJson, scene: Phaser.Scene): EditableObject
}

export type CreateEditableObjectJson<T extends { type: string }> = Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson = EditableContainerJson | EditableImageJson

export type EditableObjectJsonType = EditableObjectJson['type']

// const EDITABLE_CLASSES = [EditableContainer, EditableImage]

// export type EditableObjectClass = (typeof EDITABLE_CLASSES)[number]
export type EditableObjectClass = typeof EditableContainer | typeof EditableImage

export type EditableObject = InstanceType<EditableObjectClass>
