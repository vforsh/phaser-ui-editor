import { Columns3, Dock, Globe, LayoutGrid, LucideIcon, Pointer, Rows3 } from 'lucide-react'
import { EditableComponentType } from '../../../canvas/phaser/scenes/main/objects/components/base/EditableComponent'

export type ComponentListItemData = {
	type: EditableComponentType
	title: string
	description: string
	group: string
	icon: LucideIcon
}

/**
 * Data we use to display the list of components when adding a component to an object.
 */
export const ComponentsListData = {
	'horizontal-layout': {
		type: 'horizontal-layout',
		title: 'Horizontal Layout',
		description: 'Align items horizontally (in a row)',
		group: 'Layout',
		icon: Columns3,
	},
	'vertical-layout': {
		type: 'vertical-layout',
		title: 'Vertical Layout',
		description: 'Align items vertically (in a column)',
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
	'layout': {
		type: 'layout',
		title: 'Layout',
		description: 'Align object to parent bounds',
		group: 'Layout',
		icon: Dock,
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
