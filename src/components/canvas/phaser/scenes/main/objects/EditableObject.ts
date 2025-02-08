import { match } from 'ts-pattern'
import { EditableBitmapText, EditableBitmapTextJson } from './EditableBitmapText'
import { EditableContainer, EditableContainerJson } from './EditableContainer'
import { EditableImage, EditableImageJson } from './EditableImage'
import { EditableNineSlice, EditableNineSliceJson } from './EditableNineSlice'
import { EditableText, EditableTextJson } from './EditableText'
import { EditableComponentJson } from './components/EditableComponent'
import { ComponentsManager } from './components/ComponentsManager'

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

	get stateObj(): EditableObjectJson

	get components(): ComponentsManager
}

export type EditableObject = EditableContainer | EditableImage | EditableNineSlice | EditableText | EditableBitmapText

export type EditableObjectType = EditableObject['kind']

// #region JSON
export type CreateEditableObjectJson<
	T extends { readonly type: string; locked: boolean; components: EditableComponentJson[] },
> = Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson =
	| EditableContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson

export type EditableObjectJsonType = EditableObjectJson['type']
// #endregion

export function isTintable(obj: EditableObject): obj is EditableObject & { tint: number; tintFill: boolean } {
	return 'tint' in obj && typeof obj.tint === 'number' && 'tintFill' in obj && typeof obj.tintFill === 'boolean'
}

export function canChangeOrigin(type: EditableObjectJsonType): boolean {
	return match(type)
		.with('Container', () => false)
		.with('NineSlice', () => false)
		.with('Image', () => true)
		.with('Text', () => true)
		.with('BitmapText', () => true)
		.exhaustive()
}

export function canChangeScale(type: EditableObjectJsonType): boolean {
	return match(type)
		.with('Container', () => true)
		.with('NineSlice', () => false)
		.with('Image', () => true)
		.with('Text', () => true)
		.with('BitmapText', () => true)
		.exhaustive()
}
