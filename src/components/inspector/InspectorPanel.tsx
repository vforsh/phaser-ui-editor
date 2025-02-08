import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/IEditableObject'
import { ScrollArea, Stack } from '@mantine/core'
import { state } from '@state/State'
import { Eye, Image, Info, Move, Type, TypeOutline } from 'lucide-react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { useSnapshot } from 'valtio'
import { getAssetById, isGraphicAsset, type AssetTreeItemData } from '../../types/assets'
import { InspectorSection, InspectorSectionDef } from './InspectorSection'
import { NoSelection } from './NoSelection'
import { AssetSection } from './sections/assets/AssetSection'
import { BitmapFontSection } from './sections/assets/BitmapFontSection'
import { GraphicAssetPreviewSection } from './sections/assets/GraphicAssetPreviewSection'
import { BitmapTextSection } from './sections/objects/BitmapTextSection'
import { DisplaySection } from './sections/objects/DisplaySection'
import { ImageSection } from './sections/objects/ImageSection'
import { NineSliceSection } from './sections/objects/NineSliceSection'
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
	const assetsSnap = useSnapshot(state.assets)

	// Don't show anything if multiple items are selected
	if (assetsSnap.selection.length > 1 || canvasSnap.selection.length > 1) {
		return (
			<Stack gap="xs" p="xs">
				<NoSelection />
			</Stack>
		)
	}

	const selectedAssetId = assetsSnap.selection[0]
	const selectedObjectId = canvasSnap.selection[0]

	// To determine what to display based on most recent selection
	const assetChangedAt = assetsSnap.selectionChangedAt || 0
	const objectChangedAt = canvasSnap.selectionChangedAt || 0

	// Show most recently selected item
	if (selectedAssetId && (!selectedObjectId || assetChangedAt > objectChangedAt)) {
		// Find selected asset
		const selectedAsset = getAssetById(assetsSnap.items as AssetTreeItemData[], selectedAssetId)
		if (selectedAsset) {
			const sections = createSections({ type: 'asset', data: selectedAsset })
			return (
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap="xs" p="xs">
						{sections.map((section) => (
							<InspectorSection
								key={section.type}
								type={section.type}
								title={section.title}
								icon={section.icon}
								content={section.content}
								defaultExpanded={section.defaultExpanded}
							/>
						))}
					</Stack>
				</ScrollArea>
			)
		}
	}

	// Show selected object if no asset is selected or object was selected more recently
	if (selectedObjectId && canvasSnap.objectById) {
		const selectedObject = canvasSnap.objectById(selectedObjectId)
		if (selectedObject) {
			const sections = createSections({ type: 'object', data: selectedObject })
			return (
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap="xs" p="xs">
						{sections.map((section) => (
							<InspectorSection
								key={section.type}
								type={section.type}
								title={section.title}
								icon={section.icon}
								content={section.content}
								defaultExpanded={section.defaultExpanded}
							/>
						))}
					</Stack>
				</ScrollArea>
			)
		}
	}

	// No selection
	return (
		<Stack gap="xs" p="xs">
			<NoSelection />
		</Stack>
	)
}

// TODO  move to InspectorSectionsFactory
function createSections(item: ItemToInspect): InspectorSectionDef[] {
	return match(item)
		.with({ type: 'asset' }, (asset) => getAssetSections(asset.data))
		.with({ type: 'object' }, (object) => getObjectSections(object.data))
		.exhaustive()
}

function getAssetSections(item: AssetTreeItemData): InspectorSectionDef[] {
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

	const assetTypeSections = match(item)
		.returnType<InspectorSectionDef[]>()
		.with({ type: 'bitmap-font' }, (bitmapFont) => {
			return [
				{
					type: 'asset-bitmap-font',
					title: 'Bitmap Font',
					icon: TypeOutline,
					data: bitmapFont,
					content: <BitmapFontSection data={bitmapFont} />,
					defaultExpanded: true,
				},
			]
		})
		.otherwise(() => [])

	return [...sections, ...assetTypeSections]
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
		.with({ type: 'NineSlice' }, (nineSlice) => {
			return [
				{
					type: 'obj-nine-slice',
					title: 'NineSlice',
					icon: Image,
					data: nineSlice,
					content: <NineSliceSection data={nineSlice} />,
					defaultExpanded: true,
				},
			]
		})
		.with({ type: 'BitmapText' }, (bitmapText) => {
			return [
				{
					type: 'obj-bitmap-text',
					title: 'Bitmap Text',
					icon: TypeOutline,
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
		.exhaustive()

	const componentSections: InspectorSectionDef[] = []

	return [...baseSections, ...objectTypeSections, ...componentSections]
}
