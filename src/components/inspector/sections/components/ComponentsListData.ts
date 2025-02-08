import { LucideIcon, SquareArrowOutDownRight } from 'lucide-react'
import { EditableComponentType } from '../../../canvas/phaser/scenes/main/objects/components/EditableComponent'

type ComponentListItemData = {
	type: EditableComponentType
	title: string
	description: string
	group: string
	icon: LucideIcon
}

export const ComponentsListData = {
	pinner: {
		type: 'pinner',
		title: 'Pinner',
		description: 'Pinner Component',
		group: 'Layout',
		icon: SquareArrowOutDownRight,
	},
} satisfies { [type in EditableComponentType]: ComponentListItemData }
