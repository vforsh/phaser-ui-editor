import { EditableBitmapTextJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableNineSliceJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { EditableTextJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableText'

type HierarchyImage = EditableImageJsonBasic & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyNineSlice = EditableNineSliceJsonBasic & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyContainer = Omit<EditableContainerJsonBasic, 'children'> & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
	children: HierarchyItemData[]
}

type HierarchyText = EditableTextJsonBasic & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

type HierarchyBitmapText = EditableBitmapTextJsonBasic & {
	path: string
	isSelected?: boolean
	isHovered?: boolean
}

export type HierarchyItemData =
	| HierarchyImage
	| HierarchyNineSlice
	| HierarchyContainer
	| HierarchyText
	| HierarchyBitmapText
