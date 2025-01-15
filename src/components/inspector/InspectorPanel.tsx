import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { Stack } from '@mantine/core'
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
		/* .with({ type: 'BitmapText' }, (bitmapText) => {
			return [
				{
					id: 'bitmap-text',
					title: 'Bitmap Text',
					icon: Type,
					content: createBitmapTextSection(bitmapText),
					defaultExpanded: true,
				},
			]
		}) */
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

	return baseSections
}

function createBitmapTextSection(bitmapText: EditableBitmapTextJson) {
	return (
		<BitmapTextSection
			data={{
				content: bitmapText.text,
				font: bitmapText.font,
				fontSize: bitmapText.fontSize,
				// TODO fix type assertion
				align: bitmapText.align as any,
				maxWidth: bitmapText.maxWidth,
				letterSpacing: bitmapText.letterSpacing,
				lineSpacing: bitmapText.lineSpacing,
			}}
			onChange={() => {}}
		/>
	)
}

/* function createTextSection(text: EditableTextJson) {
	function getFontSize(style: (typeof text)['style']): number {
		if (!style.fontSize) {
			return 24
		}

		if (typeof style.fontSize === 'number') {
			return style.fontSize
		}

		return parseInt(style.fontSize) || 24
	}

	function getFontColor(style: (typeof text)['style']): string {
		if (typeof style.color === 'string') {
			return style.color
		}

		return '#000000'
	}

	function getAlign(style: (typeof text)['style']): TextAlignType {
		if (!style.align) {
			return 'center'
		}

		if (isTextAlignType(style.align)) {
			return style.align as TextAlignType
		}

		return 'center'
	}

	return (
		<TextSection
			properties={{
				content: text.text,
				resolution: text.style.resolution ?? 1,
				fontFamily: text.style.fontFamily ?? '',
				fontSize: getFontSize(text.style),
				fontColor: getFontColor(text.style),
				align: getAlign(text.style),
				// padding: { x: text.style.padding?.x ?? 0, y: text.style.padding?.y ?? 0 },
				padding: { x: 0, y: 0 },
				letterSpacing: text.letterSpacing ?? 0,
				// lineSpacing: text.style.lineSpacing ?? 0,
				lineSpacing: 0,
				wordWrapWidth: text.style.wordWrapWidth ?? 0,
				wordWrapAdvanced: text.style.wordWrapUseAdvanced ?? false,
			}}
			onChange={(changes) => {
				console.log('Text properties changed:', changes)
				// TODO: Update text properties in state
			}}
		/>
	)
} */

/* function createTextShadowSection(textStyle: EditableTextStyleJson) {
	if (!textStyle) {
		return <TextShadowSection properties={{ enabled: false }} onChange={() => {}} />
	}

	return (
		<TextShadowSection
			properties={{
				enabled: true,
				offsetX: textStyle.shadowOffsetX ?? 0,
				offsetY: textStyle.shadowOffsetY ?? 0,
				blur: textStyle.shadowBlur ?? 0,
				color: textStyle.shadowColor ?? '#000000',
				stroke: textStyle.shadowStroke ?? false,
				fill: textStyle.shadowFill ?? false,
			}}
			onChange={() => {}}
		/>
	)
} */

/* function createTextStrokeSection(textStyle: EditableTextStyleJson) {
	if (!textStyle.strokeThickness) {
		return <TextStrokeSection properties={{ enabled: false }} onChange={() => {}} />
	}

	return (
		<TextStrokeSection
			properties={{
				enabled: true,
				thickness: textStyle.strokeThickness ?? 0,
				color: textStyle.stroke ?? '#000000',
			}}
			onChange={() => {}}
		/>
	)
} */
