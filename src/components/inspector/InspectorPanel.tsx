import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import { Eye, Image, Info, Move, Type } from 'lucide-react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { useSnapshot } from 'valtio'
import { isGraphicAsset, type AssetTreeItemData } from '../../types/assets'
import { InspectorSection, InspectorSectionDef } from './InspectorSection'
import { NoSelection } from './NoSelection'
import { AssetSection } from './sections/assets/AssetSection'
import { GraphicAssetPreviewSection } from './sections/assets/GraphicAssetPreviewSection'
import { BitmapTextSection } from './sections/objects/BitmapTextSection'
import { DisplaySection } from './sections/objects/DisplaySection'
import { ImageSection } from './sections/objects/ImageSection'
import { ObjectSection } from './sections/objects/ObjectSection'
import { TextSection } from './sections/objects/TextSection'
import { TextShadowSection } from './sections/objects/TextShadowSection'
import { TextStrokeSection } from './sections/objects/TextStrokeSection'
import { TransformSection } from './sections/objects/TransformSection'

export type AssetToInspect = { type: 'asset'; data: AssetTreeItemData }
export type ObjectToInspect = { type: 'object'; data: EditableObjectJson }
export type ItemToInspect = AssetToInspect | ObjectToInspect

interface InspectorPanelProps {
	logger: Logger<{}>
}

export default function InspectorPanel({ logger }: InspectorPanelProps) {
	const canvasSnap = useSnapshot(state.canvas)

	if (canvasSnap.selection.length !== 1 || !canvasSnap.objectById) {
		return (
			<Stack gap="xs" p="xs">
				<NoSelection />
			</Stack>
		)
	}

	const canvasObjState = canvasSnap.objectById(canvasSnap.selection[0])
	if (!canvasObjState) {
		return (
			<Stack gap="xs" p="xs">
				<NoSelection />
			</Stack>
		)
	}

	const selectedItem = { type: 'object' as const, data: canvasObjState }
	const sections = createSections(selectedItem)

	return (
		<ScrollArea style={{ flex: 1 }}>
			<Stack gap="xs" p="xs">
				{sections.map((section) => {
					return (
						<InspectorSection
							key={section.type}
							type={section.type}
							title={section.title}
							icon={section.icon}
							content={section.content}
							defaultExpanded={section.defaultExpanded}
						/>
					)
				})}
			</Stack>
		</ScrollArea>
	)
}

// TODO  move to InspectorSectionsFactory
function createSections(item: ItemToInspect): InspectorSectionDef[] {
	return match(item)
		.with({ type: 'asset' }, (asset) => getAssetSections(asset.data))
		.with({ type: 'object' }, (object) => getObjectSections(object.data))
		.exhaustive()
}

function getAssetSections(item: AssetTreeItemData) {
	const sections: InspectorSectionDef[] = [
		{
			type: 'asset-info',
			title: 'Basic Information',
			icon: Info,
			data: item,
			content: <AssetSection data={item} />,
			defaultExpanded: true,
		},
	]

	// Add preview section for supported asset types
	if (isGraphicAsset(item)) {
		sections.unshift({
			type: 'asset-graphic-preview',
			title: 'Preview',
			icon: Image,
			data: item,
			content: <GraphicAssetPreviewSection data={item} />,
			defaultExpanded: true,
		})
	}

	// Add asset-specific sections
	switch (item.type) {
		default:
			break
	}

	return sections
}

function getObjectSections(obj: EditableObjectJson): InspectorSectionDef[] {
	const baseSections: InspectorSectionDef[] = [
		{
			type: 'obj-info',
			title: 'Object Info',
			icon: Info,
			data: obj,
			content: <ObjectSection data={obj} />,
			defaultExpanded: false,
		},
		{
			type: 'obj-display',
			title: 'Display',
			icon: Eye,
			data: obj,
			content: <DisplaySection data={obj} />,
			defaultExpanded: false,
		},
		{
			type: 'obj-transform',
			title: 'Transform',
			icon: Move,
			data: obj,
			content: <TransformSection data={obj} />,
			defaultExpanded: false,
		},
		// TODO add ObjectDataSection that will allow to edit object.data (https://docs.phaser.io/api-documentation/class/data-datamanager)
	]

	const objectTypeSections = match(obj)
		.returnType<InspectorSectionDef[]>()
		.with({ type: 'Container' }, (container) => {
			// TODO add grid align section
			return []
		})
		.with({ type: 'Image' }, (image) => {
			return [
				{
					type: 'obj-image',
					title: 'Image',
					icon: Image,
					data: image,
					content: <ImageSection data={image} />,
					defaultExpanded: true,
				},
			]
		})
		.with({ type: 'BitmapText' }, (bitmapText) => {
			return [
				{
					type: 'obj-bitmap-text',
					title: 'Bitmap Text',
					icon: Type,
					data: bitmapText,
					content: <BitmapTextSection data={bitmapText} />,
					defaultExpanded: true,
				},
			]
		})
		.with({ type: 'Text' }, (text) => {
			const textSections: InspectorSectionDef[] = [
				{
					type: 'obj-text',
					title: 'Text',
					icon: Type,
					data: text,
					content: <TextSection data={text} />,
					defaultExpanded: true,
				},
				{
					type: 'obj-text-shadow',
					title: 'Text Shadow',
					icon: Type,
					data: text.style,
					content: <TextShadowSection data={text.style} />,
					defaultExpanded: true,
				},
				{
					type: 'obj-text-stroke',
					title: 'Text Stroke',
					icon: Type,
					data: text.style,
					content: <TextStrokeSection data={text.style} />,
					defaultExpanded: true,
				},
			]

			return textSections
		})
		// TODO replace with exhaustive()
		.otherwise(() => [])

	const componentSections: InspectorSectionDef[] = []

	return [...baseSections, ...objectTypeSections, ...componentSections]
}
