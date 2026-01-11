export type LayoutUnit = 'px' | 'percent'

export type LayoutScalar = {
	value: number
	unit: LayoutUnit
}

export type HorizontalConstraint =
	| { mode: 'none' }
	| { mode: 'start'; start: LayoutScalar }
	| { mode: 'center'; center: LayoutScalar }
	| { mode: 'end'; end: LayoutScalar }
	| { mode: 'stretch'; start: LayoutScalar; end: LayoutScalar }

export type VerticalConstraint =
	| { mode: 'none' }
	| { mode: 'start'; start: LayoutScalar }
	| { mode: 'center'; center: LayoutScalar }
	| { mode: 'end'; end: LayoutScalar }
	| { mode: 'stretch'; start: LayoutScalar; end: LayoutScalar }

export type LayoutComponentJson = {
	type: 'layout'
	id: string
	active: boolean
	horizontal: HorizontalConstraint
	vertical: VerticalConstraint
}
