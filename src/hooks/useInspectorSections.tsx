import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ItemToInspect } from '@components/inspector/InspectorPanel'
import { Eye, Image, Info, Link, Move } from 'lucide-react'
import { useMemo } from 'react'
import { match } from 'ts-pattern'
import { BasicAssetInfoSection } from '../components/inspector/sections/assets/BasicAssetInfoSection'
import { GraphicAssetPreview } from '../components/inspector/sections/assets/GraphicAssetPreview'
import { DisplaySection, type DisplayProperties } from '../components/inspector/sections/canvas/DisplaySection'
import { TransformSection } from '../components/inspector/sections/canvas/TransformSection'
import { AssetTreeItemData, isGraphicAsset } from '../types/assets'

export function useInspectorSections(item: ItemToInspect) {
	return useMemo(() => {
		return match(item)
			.with({ type: 'asset' }, (asset) => getAssetSections(asset.data))
			.with({ type: 'object' }, (object) => getObjectSections(object.data))
			.exhaustive()
	}, [item])
}

function getAssetSections(item: AssetTreeItemData) {
	const sections = [
		{
			id: 'basic-info',
			title: 'Basic Information',
			icon: Info,
			content: <BasicAssetInfoSection asset={item} />,
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
		case 'spritesheet':
			sections.push({
				id: 'references',
				title: 'References',
				icon: Link,
				content: (
					<BasicAssetInfoSection
						asset={{
							type: 'json',
							name: item.json.name,
							path: item.json.path,
						}}
					/>
				),
				defaultExpanded: false,
			})
			break
	}

	return sections
}

function getObjectSections(item: EditableObjectJson) {
	const sections = [
		{
			id: 'display',
			title: 'Display',
			icon: Eye,
			content: (
				<DisplaySection
					properties={defaultDisplayProperties}
					onChange={(changes) => {
						console.log('Display properties changed:', changes)
						// TODO: Update display properties in state
					}}
				/>
			),
			defaultExpanded: true,
		},
		{
			id: 'transform',
			title: 'Transform',
			icon: Move,
			content: <TransformSection />,
			defaultExpanded: true,
		},
	]

	// TODO add object-specific sections

	return sections
}

const defaultDisplayProperties: DisplayProperties = {
	visible: true,
	alpha: 100,
	blendMode: 'NORMAL',
}
