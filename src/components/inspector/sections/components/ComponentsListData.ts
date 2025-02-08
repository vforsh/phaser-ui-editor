import { Columns3, Globe, Grid2x2Plus, LayoutGrid, LucideIcon, Pointer, Rows3 } from 'lucide-react'
import { EditableComponentType } from '../../../canvas/phaser/scenes/main/objects/components/EditableComponent'

export type ComponentListItemData = {
	type: EditableComponentType
	title: string
	description: string
	group: string
	icon: LucideIcon
}

export const ComponentsListData = {
	'pinner': {
		type: 'pinner',
		title: 'Pinner',
		description: 'Pinner Component',
		group: 'Layout',
		icon: Grid2x2Plus,
	},
	'horizontal-layout': {
		type: 'horizontal-layout',
		title: 'Horizontal Layout',
		description: 'Horizontal Layout Component (row)',
		group: 'Layout',
		icon: Columns3,
	},
	'vertical-layout': {
		type: 'vertical-layout',
		title: 'Vertical Layout',
		description: 'Vertical Layout Component (column)',
		group: 'Layout',
		icon: Rows3,
	},
	'grid-layout': {
		type: 'grid-layout',
		title: 'Grid Layout',
		description: 'Grid Layout Component',
		group: 'Layout',
		icon: LayoutGrid,
	},
	'localization': {
		type: 'localization',
		title: 'Localization',
		description: 'Localization Component',
		group: 'Localization',
		icon: Globe,
	},
	'input': {
		type: 'input',
		title: 'Input',
		description: 'Input Component',
		group: 'Input',
		icon: Pointer,
	},
} satisfies { [type in EditableComponentType]: ComponentListItemData }
