import { EditableGridLayoutComponent, GridLayoutComponentJson } from '../EditableGridLayoutComponent'
import { EditableHorizontalLayoutComponent, HorizontalLayoutComponentJson } from '../EditableHorizontalLayoutComponent'
import { EditablePinnerComponent, PinnerComponentJson } from '../EditablePinnerComponent'
import { EditableVerticalLayoutComponent, VerticalLayoutComponentJson } from '../EditableVerticalLayoutComponent'

export type EditableComponent =
	| EditablePinnerComponent
	| EditableHorizontalLayoutComponent
	| EditableVerticalLayoutComponent
	| EditableGridLayoutComponent

export type EditableComponentType = EditableComponent['type'] | 'localization' | 'input'

export type EditableComponentJson =
	| PinnerComponentJson
	| HorizontalLayoutComponentJson
	| VerticalLayoutComponentJson
	| GridLayoutComponentJson
