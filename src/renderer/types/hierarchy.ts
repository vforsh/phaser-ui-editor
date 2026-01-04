import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableNineSliceJson } from '@components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { EditableTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'

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
