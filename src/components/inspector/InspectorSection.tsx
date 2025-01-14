import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJson } from '@components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableNineSlice } from '@components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { ChevronRight, LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { ValueOf } from 'type-fest'
import classes from './InspectorSection.module.css'
import { AssetSectionData } from './sections/assets/AssetSection'
import { GraphicAssetPreviewSectionData } from './sections/assets/GraphicAssetPreviewSection'

type AssetSectionDef =
	| { type: 'asset-info'; data: AssetSectionData }
	| { type: 'asset-graphic-preview'; data: GraphicAssetPreviewSectionData }

type ObjectSectionDef =
	| { type: 'obj-info'; data: EditableObjectJson }
	| { type: 'obj-display'; data: EditableObjectJson }
	| { type: 'obj-transform'; data: EditableObjectJson }
	//
	| { type: 'obj-image'; data: EditableImageJson }
	| { type: 'obj-bitmap-text'; data: EditableBitmapTextJson }
	| { type: 'obj-text'; data: EditableTextJson }
	| { type: 'obj-nine-patch'; data: EditableNineSlice }
	| { type: 'obj-container'; data: EditableContainerJson }

type SectionDefBase = AssetSectionDef | ObjectSectionDef

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
