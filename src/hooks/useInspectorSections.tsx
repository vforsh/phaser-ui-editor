import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableTextJson, EditableTextStyleJson } from '@components/canvas/phaser/scenes/main/objects/EditableText'
import { ItemToInspect } from '@components/inspector/InspectorPanel'
import { InspectorSectionProps } from '@components/inspector/InspectorSection'
import { BitmapTextSection } from '@components/inspector/sections/objects/BitmapTextSection'
import { ImageSection } from '@components/inspector/sections/objects/ImageSection'
import { ObjectSection } from '@components/inspector/sections/objects/ObjectSection'
import { isTextAlignType, TextAlignType, TextSection } from '@components/inspector/sections/objects/TextSection'
import { TextShadowSection } from '@components/inspector/sections/objects/TextShadowSection'
import { TextStrokeSection } from '@components/inspector/sections/objects/TextStrokeSection'
import { Eye, Image, Info, Move, Type } from 'lucide-react'
import { useMemo } from 'react'
import { match } from 'ts-pattern'
import { AssetSection } from '../components/inspector/sections/assets/AssetSection'
import { GraphicAssetPreview } from '../components/inspector/sections/assets/GraphicAssetPreview'
import { DisplaySection, type DisplayProperties } from '../components/inspector/sections/objects/DisplaySection'
import { TransformSection } from '../components/inspector/sections/objects/TransformSection'
import { AssetTreeItemData, isGraphicAsset } from '../types/assets'

export function useInspectorSections(item: ItemToInspect): InspectorSectionProps[] {
	return useMemo(() => {
		return match(item)
			.with({ type: 'asset' }, (asset) => getAssetSections(asset.data))
			.with({ type: 'object' }, (object) => getObjectSections(object.data))
			.exhaustive()
	}, [item])
}

function getAssetSections(item: AssetTreeItemData): InspectorSectionProps[] {
	const sections = [
		{
			id: 'basic-info',
			title: 'Basic Information',
			icon: Info,
			content: <AssetSection asset={item} />,
			defaultExpanded: true,
		},
	]

	// Add preview section for supported asset types
	if (isGraphicAsset(item)) {
		sections.unshift({
			id: 'preview',
			title: 'Preview',
			icon: Image,
			content: <GraphicAssetPreview asset={item} />,
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

function getObjectSections(obj: EditableObjectJson): InspectorSectionProps[] {
	const baseSections = [
		{
			id: 'basic-object-props',
			title: 'Object Info',
			icon: Info,
			content: createObjectSection(obj),
			defaultExpanded: true,
		},
		{
			id: 'display',
			title: 'Display',
			icon: Eye,
			content: (
				<DisplaySection
					props={defaultDisplayProperties}
					onChange={(changes) => {
						console.log('Display properties changed:', changes)
						// TODO: Update display properties in state
					}}
				/>
			),
			defaultExpanded: false,
		},
		{
			id: 'transform',
			title: 'Transform',
			icon: Move,
			content: <TransformSection />,
			defaultExpanded: false,
		},
		// TODO add ObjectDataSection that will allow to edit object.data (https://docs.phaser.io/api-documentation/class/data-datamanager)
	]

	const objectTypeSections = match(obj)
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

	const componentSections: InspectorSectionProps[] = []

	return [...baseSections, ...objectTypeSections, ...componentSections]
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

function createObjectSection(obj: EditableObjectJson) {
	return (
		<ObjectSection
			data={obj}
			onChange={{
				name: (value, prevValue) => {
					// appCommands.emit('obj-name-change', obj.id, value, prevValue)
				},
				locked: (value, prevValue) => {
					// appCommands.emit('obj-locked-change', obj.id, value, prevValue)
				},
			}}
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

const defaultDisplayProperties: DisplayProperties = {
	visible: true,
	alpha: 100,
	blendMode: 'NORMAL',
}
