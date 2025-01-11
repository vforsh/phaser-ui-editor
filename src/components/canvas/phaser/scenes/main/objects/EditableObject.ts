import { EditableBitmapText, EditableBitmapTextJson, EditableBitmapTextJsonBasic } from './EditableBitmapText'
import { EditableContainer, EditableContainerJson, EditableContainerJsonBasic } from './EditableContainer'
import { EditableImage, EditableImageJson, EditableImageJsonBasic } from './EditableImage'
import { EditableText, EditableTextJson, EditableTextJsonBasic } from './EditableText'

export const EDITABLE_SYMBOL = Symbol('EditableObject')

export function isEditable(obj: Phaser.GameObjects.GameObject): obj is EditableObject {
	return EDITABLE_SYMBOL in obj && obj[EDITABLE_SYMBOL] === true
}

export interface IEditableObject {
	[EDITABLE_SYMBOL]: true

	// we use 'kind' because 'type' is already used by Phaser
	get kind(): string

	get id(): string

	set locked(value: boolean)
	get locked(): boolean
	set visible(value: boolean)
	get visible(): boolean

	// can change displayWidth and displayHeight for this object
	get isResizable(): boolean

	toJson(): EditableObjectJson

	// returns simplified state of the object to use in Hierarchy Panel
	toJsonBasic(): EditableObjectJsonBasic

	// addComponent(component: EditableObjectComponent): void
	// removeComponent(component: EditableObjectComponent): void
	// getComponent<T extends typeof EditableObjectComponent>(component: T): InstanceType<T>
}

export type EditableObject = EditableContainer | EditableImage | EditableText | EditableBitmapText

export type EditableObjectType = EditableObject['kind']

// #region JSON
export type CreateEditableObjectJson<T extends { type: string; locked: boolean }> =
	Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson = EditableContainerJson | EditableImageJson | EditableTextJson | EditableBitmapTextJson

export type EditableObjectJsonType = EditableObjectJson['type']
// #endregion

// #region JSON Basic
export type CreateEditableObjectJsonBasic<T extends { type: string }> = T & {
	id: string
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

export function isTintable(obj: EditableObject): obj is EditableObject & { tint: number; tintFill: boolean } {
	return 'tint' in obj && typeof obj.tint === 'number' && 'tintFill' in obj && typeof obj.tintFill === 'boolean'
}
