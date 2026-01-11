import type { GridLayoutComponentJson } from './GridLayoutComponent'
import type { HorizontalLayoutComponentJson } from './HorizontalLayoutComponent'
import type { LayoutComponentJson } from './LayoutComponent'
import type { VerticalLayoutComponentJson } from './VerticalLayoutComponent'

export type EditableComponentJson =
	| HorizontalLayoutComponentJson
	| VerticalLayoutComponentJson
	| GridLayoutComponentJson
	| LayoutComponentJson
