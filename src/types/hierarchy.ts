import { EditableBitmapTextJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableTextJsonBasic } from '@components/canvas/phaser/scenes/main/objects/EditableText'

type HierarchyImage = EditableImageJsonBasic & {
	path: string
}

type HierarchyContainer = Omit<EditableContainerJsonBasic, 'children'> & {
	path: string
	children: HierarchyItemData[]
}

type HierarchyText = EditableTextJsonBasic & {
	path: string
}

type HierarchyBitmapText = EditableBitmapTextJsonBasic & {
	path: string
}

export type HierarchyItemData = HierarchyImage | HierarchyContainer | HierarchyText | HierarchyBitmapText
