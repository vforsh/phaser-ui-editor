import type {
	EditableBitmapTextJson,
	EditableContainerJson,
	EditableGraphicsJson,
	EditableImageJson,
	EditableNineSliceJson,
	EditableObjectJson,
	EditableTextJson,
	EditableTextStyleJson,
	GridLayoutComponentJson,
	HorizontalLayoutComponentJson,
	LayoutComponentJson,
	VerticalLayoutComponentJson,
} from '@tekton/runtime'

import { EditableNineSlice } from '@components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { ChevronRight, LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { ValueOf } from 'type-fest'

import { AssetTreeBitmapFontData, AssetTreeWebFontData } from '../../types/assets'
import classes from './InspectorSection.module.css'
import { AssetSectionData } from './sections/assets/AssetSection'
import { GraphicAssetPreviewSectionData } from './sections/assets/GraphicAssetPreviewSection'
import { PrefabAssetPreviewSectionData } from './sections/assets/PrefabAssetPreviewSection'

type AssetSectionDef =
	| { type: 'asset-info'; data: AssetSectionData }
	| { type: 'asset-graphic-preview'; data: GraphicAssetPreviewSectionData }
	| { type: 'asset-prefab-preview'; data: PrefabAssetPreviewSectionData }
	| { type: 'asset-bitmap-font'; data: AssetTreeBitmapFontData }
	| { type: 'asset-web-font'; data: AssetTreeWebFontData }

type ObjectSectionDef =
	| { type: 'obj-info'; data: EditableObjectJson }
	| { type: 'obj-display'; data: EditableObjectJson }
	| { type: 'obj-transform'; data: EditableObjectJson }
	| { type: 'obj-size'; data: EditableObjectJson }
	//
	| { type: 'obj-image'; data: EditableImageJson }
	| { type: 'obj-nine-slice'; data: EditableNineSliceJson }
	| { type: 'obj-bitmap-text'; data: EditableBitmapTextJson }
	| { type: 'obj-text'; data: EditableTextJson }
	| { type: 'obj-text-shadow'; data: EditableTextStyleJson }
	| { type: 'obj-text-stroke'; data: EditableTextStyleJson }
	| { type: 'obj-nine-patch'; data: EditableNineSlice }
	| { type: 'obj-container'; data: EditableContainerJson }
	| { type: 'obj-container-grid'; data: EditableContainerJson }
	| { type: 'obj-graphics-shape'; data: EditableGraphicsJson }
	| { type: 'obj-graphics-fill'; data: EditableGraphicsJson['fill'] }
	| { type: 'obj-graphics-stroke'; data: EditableGraphicsJson['stroke'] }

type ComponentSectionDef =
	| { type: 'comp-horizontal-layout'; data: HorizontalLayoutComponentJson }
	| { type: 'comp-vertical-layout'; data: VerticalLayoutComponentJson }
	| { type: 'comp-grid-layout'; data: GridLayoutComponentJson }
	| { type: 'comp-layout'; data: LayoutComponentJson }

type SectionDefBase = AssetSectionDef | ObjectSectionDef | ComponentSectionDef

export type GetDefByType<T extends SectionDefBase['type']> = Extract<SectionDefBase, { type: T }>

export type InspectorSectionDef = ValueOf<{
	[T in SectionDefBase['type']]: CreateInspectorSectionDef<GetDefByType<T>>
}>

type CreateInspectorSectionDef<T extends SectionDefBase> = {
	type: T['type']
	title: string
	icon: LucideIcon
	defaultExpanded?: boolean
	data: T['data']
	content: React.ReactNode
}

export type InspectorSectionProps = Omit<InspectorSectionDef, 'data' | 'content'> & {
	content: React.ReactNode
}

export function InspectorSection(props: InspectorSectionProps) {
	const { title, icon: Icon, content, defaultExpanded } = props
	const [expanded, setExpanded] = useState(defaultExpanded ?? false)

	return (
		<Box>
			<UnstyledButton onClick={() => setExpanded(!expanded)} className={classes.button}>
				<Group gap="xs">
					<div
						style={{
							transform: `rotate(${expanded ? '90deg' : '0deg'})`,
							transition: 'transform 30ms ease',
						}}
					>
						<ChevronRight size={16} />
					</div>
					<Icon size={16} />
					<Text size="sm" fw={500}>
						{title}
					</Text>
				</Group>
			</UnstyledButton>

			<Collapse in={expanded} transitionDuration={30}>
				<Box pt="xs" pb="sm" px="sm">
					{content}
				</Box>
			</Collapse>
		</Box>
	)
}
