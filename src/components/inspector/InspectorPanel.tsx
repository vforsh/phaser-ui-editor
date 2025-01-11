import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableTextJson, EditableTextStyleJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { Stack } from '@mantine/core'
import { state, useSnapshot } from '@state/State'
import { Eye, Image, Info, Move } from 'lucide-react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { Primitive, ValueOf, WritableKeysOf } from 'type-fest'
import { isGraphicAsset, type AssetTreeItemData } from '../../types/assets'
import { GetDefByType, InspectorSection, InspectorSectionDef } from './InspectorSection'
import { NoSelection } from './NoSelection'
import { AssetSection } from './sections/assets/AssetSection'
import { GraphicAssetPreviewSection } from './sections/assets/GraphicAssetPreviewSection'
import { BitmapTextSection } from './sections/objects/BitmapTextSection'
import { BlendMode, DisplaySection, DisplaySectionData } from './sections/objects/DisplaySection'
import { ImageSection } from './sections/objects/ImageSection'
import { ObjectSection } from './sections/objects/ObjectSection'
import { isTextAlignType, TextAlignType, TextSection } from './sections/objects/TextSection'
import { TextShadowSection } from './sections/objects/TextShadowSection'
import { TextStrokeSection } from './sections/objects/TextStrokeSection'
import { TransformSection, TransformSectionData } from './sections/objects/TransformSection'

export type AssetToInspect = { type: 'asset'; data: AssetTreeItemData }
export type ObjectToInspect = { type: 'object'; data: EditableObjectJson }
export type ItemToInspect = AssetToInspect | ObjectToInspect

interface InspectorPanelProps {
	logger: Logger<{}>
	item: ItemToInspect | null
}

export type DataChangePayload = ValueOf<{
	[T in InspectorSectionDef['type']]: { type: T; id: string } & ValueOf<{
		[K in WritableKeysOf<Required<GetDefByType<T>['data']>>]: {
			prop: K
			value: GetDefByType<T>['data'][K] extends Primitive
				? NonNullable<GetDefByType<T>['data'][K]>
				: GetDefByType<T>['data'][K]
			prevValue: GetDefByType<T>['data'][K] extends Primitive
				? NonNullable<GetDefByType<T>['data'][K]>
				: GetDefByType<T>['data'][K]
		}
	}>
}>

export default function InspectorPanel({ logger, item: selectedItem }: InspectorPanelProps) {
	if (!selectedItem) {
		return (
			<Stack gap="xs" p="xs">
				<NoSelection />
			</Stack>
		)
	}

	const sections = createSections(selectedItem)

	const snap = useSnapshot(state)

	return (
		<Stack gap="xs" p="xs">
			{sections.map((section) => {
				const content = section.content(section.data as any, (prop, value, prevValue) => {
					// console.log('Change detected', section.type, { key, value, prevValue })

					if (selectedItem.type === 'object') {
						// @ts-expect-error
						snap.app!.commands.emit('obj-change', { type: section.type, id: selectedItem.data.id, prop, value, prevValue }) // prettier-ignore
					} else {
						// snap.app!.commands.emit('asset-change', { type: section.type, prop: key, value, prevValue })
					}
				})

				return (
					<InspectorSection
						key={section.type}
						type={section.type}
						title={section.title}
						icon={section.icon}
						content={content}
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
			content: (data, onChange) => <AssetSection data={data} onChange={onChange} />,
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
			content: (data, onChange) => <GraphicAssetPreviewSection data={data} onChange={onChange} />,
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
			content: (data, onChange) => <ObjectSection data={data} onChange={onChange} />,
			defaultExpanded: true,
		},
		{
			type: 'obj-display',
			title: 'Display',
			icon: Eye,
			data: createDisplaySectionData(obj),
			content: (data, onChange) => <DisplaySection data={data} onChange={onChange} />,
			defaultExpanded: false,
		},
		{
			type: 'obj-transform',
			title: 'Transform',
			icon: Move,
			data: createTransformSectionData(obj),
			content: (data, onChange) => <TransformSection data={data} onChange={onChange} />,
			defaultExpanded: false,
		},
		// TODO add ObjectDataSection that will allow to edit object.data (https://docs.phaser.io/api-documentation/class/data-datamanager)
	]

	/* const objectTypeSections = match(obj)
		.with({ type: 'Container' }, (container) => {
			// TODO add grid align section
			return []
		})
		.with({ type: 'Image' }, (image) => {
			return [
				{
					id: 'image',
					title: 'Image',
					icon: Image,
					content: createImageSection(image),
					defaultExpanded: false,
				},
			]
		})
		.with({ type: 'BitmapText' }, (bitmapText) => {
			return [
				{
					id: 'bitmap-text',
					title: 'Bitmap Text',
					icon: Type,
					content: createBitmapTextSection(bitmapText),
					defaultExpanded: true,
				},
			]
		})
		.with({ type: 'Text' }, (text) => {
			const textSections = [
				{
					id: 'text',
					title: 'Text',
					icon: Type,
					content: createTextSection(text),
					defaultExpanded: true,
				},
				{
					id: 'text-shadow',
					title: 'Text Shadow',
					icon: Type,
					content: createTextShadowSection(text.style),
					defaultExpanded: false,
				},
				{
					id: 'text-stroke',
					title: 'Text Stroke',
					icon: Type,
					content: createTextStrokeSection(text.style),
					defaultExpanded: false,
				},
			]

			return textSections
		})
		.exhaustive()

	const componentSections: InspectorSectionDef[] = []
	
	return [...baseSections, ...objectTypeSections, ...componentSections] */

	return baseSections
}

function createDisplaySectionData(obj: EditableObjectJson): DisplaySectionData {
	// TODO normalize blend mode from object.blendMode to DisplayData.blendMode
	// @see Phaser.BlendModes
	const blendMode = obj.blendMode as BlendMode

	const data: DisplaySectionData = {
		visible: obj.visible,
		alpha: obj.alpha,
		blendMode: blendMode,
	}

	if (isTintable(obj)) {
		data.tint = `#${obj.tint.toString(16)}`
		data.tintFill = obj.tintFill
	}

	return data
}

function isTintable(obj: EditableObjectJson): obj is EditableObjectJson & { tint: number; tintFill: boolean } {
	return 'tint' in obj && typeof obj.tint === 'number' && 'tintFill' in obj && typeof obj.tintFill === 'boolean'
}

function createTransformSectionData(obj: EditableObjectJson): TransformSectionData {
	return {
		x: obj.x,
		y: obj.y,
		originX: obj['origin.x'],
		originY: obj['origin.y'],
		angle: obj.rotation * Phaser.Math.RAD_TO_DEG,
		scaleX: obj['scale.x'],
		scaleY: obj['scale.y'],
	}
}

function createImageSection(image: EditableImageJson) {
	return (
		<ImageSection
			data={{
				texture: image.textureKey,
				frame: image.frameKey,
			}}
			onChange={() => {}}
		/>
	)
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

function createTextSection(text: EditableTextJson) {
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
}

function createTextShadowSection(textStyle: EditableTextStyleJson) {
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
}

function createTextStrokeSection(textStyle: EditableTextStyleJson) {
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
}
