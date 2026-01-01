import { GridLayoutComponent, GridLayoutComponentJson } from '../GridLayoutComponent'
import { HorizontalLayoutComponent, HorizontalLayoutComponentJson } from '../HorizontalLayoutComponent'
import { VerticalLayoutComponent, VerticalLayoutComponentJson } from '../VerticalLayoutComponent'

export type EditableComponent =
	| HorizontalLayoutComponent
	| VerticalLayoutComponent
	| GridLayoutComponent

export type EditableComponentType = EditableComponent['type'] | 'localization' | 'input'

export type EditableComponentJson =
	| HorizontalLayoutComponentJson
	| VerticalLayoutComponentJson
	| GridLayoutComponentJson
