import type {
	EditableBitmapTextJson,
	EditableContainerJson,
	EditableImageJson,
	EditableNineSliceJson,
	EditableTextJson,
} from '@tekton/runtime'

type HierarchyImage = EditableImageJson & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyNineSlice = EditableNineSliceJson & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyContainer = Omit<EditableContainerJson, 'children'> & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
	children: HierarchyItemData[]
}

type HierarchyText = EditableTextJson & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyBitmapText = EditableBitmapTextJson & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

export type HierarchyItemData = HierarchyImage | HierarchyNineSlice | HierarchyContainer | HierarchyText | HierarchyBitmapText
