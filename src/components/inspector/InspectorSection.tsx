import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { ChevronRight, LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { ValueOf, WritableKeysOf } from 'type-fest'
import { AssetSectionData } from './sections/assets/AssetSection'
import { GraphicAssetPreviewSectionData } from './sections/assets/GraphicAssetPreviewSection'
import { DisplaySectionData } from './sections/objects/DisplaySection'
import { ObjectSectionData } from './sections/objects/ObjectSection'
import { TransformSectionData } from './sections/objects/TransformSection'

type AssetSectionDef =
	| { type: 'asset-info'; data: AssetSectionData }
	| { type: 'asset-graphic-preview'; data: GraphicAssetPreviewSectionData }

type ObjectSectionDef =
	| { type: 'obj-info'; data: ObjectSectionData }
	| { type: 'obj-display'; data: DisplaySectionData }
	| { type: 'obj-transform'; data: TransformSectionData }

type SectionDefBase = AssetSectionDef | ObjectSectionDef

export type GetDefByType<T extends SectionDefBase['type']> = Extract<SectionDefBase, { type: T }>

export type ChangeCallback<T extends object, K extends WritableKeysOf<T>> = (
	key: K,
	value: T[K],
	prevValue: T[K]
) => void

export type InspectorSectionDef = ValueOf<{
	[T in SectionDefBase['type']]: CreateInspectorSectionDef<GetDefByType<T>>
}>

type CreateInspectorSectionDef<T extends SectionDefBase> = {
	type: T['type']
	title: string
	icon: LucideIcon
	defaultExpanded?: boolean
	data: T['data']
	content: (data: T['data'], onChange: ChangeCallback<T['data'], WritableKeysOf<T['data']>>) => React.ReactNode
}

export type InspectorSectionProps = Omit<InspectorSectionDef, 'data' | 'content'> & {
	content: React.ReactNode
}

export function InspectorSection(props: InspectorSectionProps) {
	const { title, icon: Icon, content, defaultExpanded } = props
	const [expanded, setExpanded] = useState(defaultExpanded ?? false)

	return (
		<Box>
			<UnstyledButton
				onClick={() => setExpanded(!expanded)}
				style={{
					width: '100%',
					padding: 'var(--mantine-spacing-xs)',
					borderRadius: 'var(--mantine-radius-sm)',
					backgroundColor: 'var(--mantine-color-dark-6)',
					transition: 'background-color 150ms ease',
				}}
			>
				<Group gap="xs">
					<div
						style={{
							transform: `rotate(${expanded ? '90deg' : '0deg'})`,
							transition: 'transform 200ms ease',
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

			<Collapse in={expanded} transitionDuration={200}>
				<Box pt="xs" pb="sm" px="sm">
					{content}
				</Box>
			</Collapse>
		</Box>
	)
}
