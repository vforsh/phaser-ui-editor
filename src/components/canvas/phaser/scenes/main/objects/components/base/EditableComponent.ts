import { GridLayoutComponent, GridLayoutComponentJson } from '../GridLayoutComponent'
import { HorizontalLayoutComponent, HorizontalLayoutComponentJson } from '../HorizontalLayoutComponent'
import { PinnerComponent, PinnerComponentJson } from '../PinnerComponent'
import { VerticalLayoutComponent, VerticalLayoutComponentJson } from '../VerticalLayoutComponent'

export type EditableComponent =
	| PinnerComponent
	| HorizontalLayoutComponent
	| VerticalLayoutComponent
	| GridLayoutComponent

export type EditableComponentType = EditableComponent['type'] | 'localization' | 'input'

export type EditableComponentJson =
	| PinnerComponentJson
	| HorizontalLayoutComponentJson
	| VerticalLayoutComponentJson
	| GridLayoutComponentJson
