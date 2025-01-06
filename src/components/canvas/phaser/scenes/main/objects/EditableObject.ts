import { EditableBitmapText, EditableBitmapTextJson, EditableBitmapTextJsonBasic } from './EditableBitmapText'
import type { EditableContainer, EditableContainerJson, EditableContainerJsonBasic } from './EditableContainer'
import type { EditableImage, EditableImageJson, EditableImageJsonBasic } from './EditableImage'
import { EditableText, EditableTextJson, EditableTextJsonBasic } from './EditableText'

export interface IEditableObject {
	set locked(value: boolean)
	get locked(): boolean
	set visible(value: boolean)
	get visible(): boolean
	
	// can change displayWidth and displayHeight for this object
	get isResizable(): boolean

	toJson(): EditableObjectJson
	toJsonBasic(): EditableObjectJsonBasic
	// static fromJson(json: EditableObjectJson, scene: Phaser.Scene): EditableObject

	// addComponent(component: EditableObjectComponent): void
	// removeComponent(component: EditableObjectComponent): void
	// getComponent<T extends typeof EditableObjectComponent>(component: T): InstanceType<T>
}

// TODO fix imports order so we can use this
// const EDITABLE_CLASSES = [EditableContainer, EditableImage]

// export type EditableObjectClass = (typeof EDITABLE_CLASSES)[number]
export type EditableObjectClass =
	| typeof EditableContainer
	| typeof EditableImage
	| typeof EditableText
	| typeof EditableBitmapText

export type EditableObject = InstanceType<EditableObjectClass>

// #region JSON
export type CreateEditableObjectJson<T extends { type: string; locked: boolean }> =
	Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson = EditableContainerJson | EditableImageJson | EditableTextJson | EditableBitmapTextJson

export type EditableObjectJsonType = EditableObjectJson['type']
// #endregion

// #region JSON Basic
export type CreateEditableObjectJsonBasic<T extends { type: string }> = T & {
	name: string
	locked: boolean
	visible: boolean
}

export type EditableObjectJsonBasic =
	| EditableContainerJsonBasic
	| EditableImageJsonBasic
	| EditableTextJsonBasic
	| EditableBitmapTextJsonBasic

export type EditableObjectJsonBasicType = EditableObjectJsonBasic['type']
// #endregion
