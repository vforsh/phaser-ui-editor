import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { match } from 'ts-pattern'

import { ComponentsManager } from './components/base/ComponentsManager'
import { EditableComponentJson } from './components/base/EditableComponent'
import { EditableBitmapText, EditableBitmapTextJson } from './EditableBitmapText'
import { EditableContainer, EditableContainerJson } from './EditableContainer'
import { EditableGraphics, EditableGraphicsJson } from './EditableGraphics'
import { EditableImage, EditableImageJson } from './EditableImage'
import { EditableNineSlice, EditableNineSliceJson } from './EditableNineSlice'
import { EditableText, EditableTextJson } from './EditableText'

export const EDITABLE_SYMBOL = Symbol('EditableObject')

export function isEditable(obj: Phaser.GameObjects.GameObject): obj is EditableObject {
	return EDITABLE_SYMBOL in obj && obj[EDITABLE_SYMBOL] === true
}

export type EditableObjectEvents = {
	'added-to-container': (container: EditableContainer) => void
	'removed-from-container': (container: EditableContainer) => void
}

export type EditableObjectEmitter = TypedEventEmitter<EditableObjectEvents>

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

	get events(): EditableObjectEmitter

	/**
	 * These methods update the underlying Phaser object's properties without syncing to the reactive state (Valtio).
	 *
	 * Use them for high-frequency visual updates (e.g., during dragging, rotating, or resizing) to avoid
	 * expensive UI re-renders on every frame.
	 *
	 * Callers MUST "commit" the final values to the state (e.g., via `setPosition`, `setAngle`, etc.)
	 * once the interaction ends.
	 */
	setAngleVisualOnly(angle: number): this
	setPositionVisualOnly(x: number, y: number): this
	setSizeVisualOnly(width: number, height: number): this
	setDisplaySizeVisualOnly(width: number, height: number): this
	setOriginVisualOnly(x: number, y: number): this
}

export type EditableObject = EditableContainer | EditableImage | EditableNineSlice | EditableText | EditableBitmapText | EditableGraphics

export type EditableObjectType = EditableObject['kind']

export type EditableObjectOfType<T extends EditableObjectType> = Extract<EditableObject, { kind: T }>

export function isObjectOfType<T extends EditableObjectType>(obj: EditableObject, type: T): obj is EditableObjectOfType<T> {
	return obj.kind === type
}

// #region JSON
export type CreateEditableObjectJson<T extends { readonly type: string; locked: boolean; components: EditableComponentJson[] }> =
	Phaser.Types.GameObjects.JSONGameObject & T

export type EditableObjectJson =
	| EditableContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson
	| EditableGraphicsJson

export type EditableObjectJsonType = EditableObjectJson['type']
// #endregion

export function isTintable(obj: EditableObject): obj is EditableObject & { tint: number; tintFill: boolean } {
	return 'tint' in obj && typeof obj.tint === 'number' && 'tintFill' in obj && typeof obj.tintFill === 'boolean'
}

export function canChangeOrigin(type: EditableObjectJsonType): boolean {
	return match(type)
		.with('Container', () => false)
		.with('Graphics', () => false)
		.with('NineSlice', () => false)
		.with('Image', () => true)
		.with('Text', () => true)
		.with('BitmapText', () => true)
		.exhaustive()
}

export function canChangeScale(type: EditableObjectJsonType): boolean {
	return match(type)
		.with('Container', () => true)
		.with('Graphics', () => true)
		.with('NineSlice', () => false)
		.with('Image', () => true)
		.with('Text', () => true)
		.with('BitmapText', () => true)
		.exhaustive()
}
