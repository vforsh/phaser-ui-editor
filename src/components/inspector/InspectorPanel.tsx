import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableComponentJson } from '@components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { Button, Divider, Group, ScrollArea, Stack } from '@mantine/core'
import { useForceUpdate } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { state } from '@state/State'
import { ClipboardPaste, Eye, Image, Info, Move, Scaling, Type, TypeOutline } from 'lucide-react'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { useSnapshot } from 'valtio'
import { getAssetById, isGraphicAsset, type AssetTreeItemData } from '../../types/assets'
import { InspectorSection, InspectorSectionDef } from './InspectorSection'
import { NoSelection } from './NoSelection'
import { AssetSection } from './sections/assets/AssetSection'
import { BitmapFontSection } from './sections/assets/BitmapFontSection'
import { GraphicAssetPreviewSection } from './sections/assets/GraphicAssetPreviewSection'
import { AddComponentButton } from './sections/components/AddComponentButton'
import { ComponentSection } from './sections/components/ComponentSection'
import { ComponentsListData } from './sections/components/ComponentsListData'
import { GridLayoutSection } from './sections/components/GridLayoutSection'
import { HorizontalLayoutSection } from './sections/components/HorizontalLayoutSection'
import { PinnerSection } from './sections/components/PinnerSection'
import { VerticalLayoutSection } from './sections/components/VerticalLayoutSection'
import { BitmapTextSection } from './sections/objects/BitmapTextSection'
import { ContainerSizeSection } from './sections/objects/ContainerSizeSection'
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
	const forceUpdate = useForceUpdate()
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

	// Show most recently selected asset item
	if (selectedAssetId && (!selectedObjectId || assetChangedAt > objectChangedAt)) {
		// Find selected asset
		const selectedAsset = getAssetById(assetsSnap.items as AssetTreeItemData[], selectedAssetId)
		if (selectedAsset) {
			const sections = createSections({ type: 'asset', data: selectedAsset })
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
	}

	// Show selected canvas object if no asset is selected or object was selected more recently
	if (selectedObjectId && canvasSnap.objectById) {
		const selectedObject = canvasSnap.objectById(selectedObjectId)
		if (selectedObject) {
			const sections = createSections({ type: 'object', data: selectedObject })
			return (
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap="xs" p="xs">
						{sections.map((section) => {
							if (section.type.startsWith('comp-')) {
								const componentData = section.data as EditableComponentJson
								return (
									<ComponentSection
										key={section.type}
										data={componentData}
										content={section.content}
										onReset={() => {
											// TODO components - implement reset functionality
										}}
										onMoveUp={() => {
											const moveUpResult = state.app?.commands.emit('move-component-up', {
												componentType: componentData.type,
												objectId: selectedObjectId,
											})!

											if (moveUpResult.isOk()) {
												forceUpdate()
											} else {
												notifications.show({
													title: 'Failed to move component up',
													message: `${moveUpResult.error}`,
													color: 'red',
													autoClose: 10_000,
												})
											}
										}}
										onMoveDown={() => {
											const moveDownResult = state.app?.commands.emit('move-component-down', {
												componentType: componentData.type,
												objectId: selectedObjectId,
											})!

											if (moveDownResult.isOk()) {
												forceUpdate()
											} else {
												notifications.show({
													title: 'Failed to move component down',
													message: `${moveDownResult.error}`,
													color: 'red',
													autoClose: 10_000,
												})
											}
										}}
										onRemove={() => {
											const removeResult = state.app?.commands.emit('remove-component', {
												componentType: componentData.type,
												objectId: selectedObjectId,
											})!

											if (removeResult.isOk()) {
												forceUpdate()
											} else {
												notifications.show({
													title: 'Failed to remove component',
													message: `${removeResult.error}`,
													color: 'red',
													autoClose: 10_000,
												})
											}
										}}
										onCopy={() => {
											state.inspector.componentsClipboard.push(JSON.stringify(componentData))
											notifications.show({
												title: 'Clipboard',
												message: `Component '${componentData.type}' copied to clipboard`,
												color: 'green',
												autoClose: 5_000,
											})
										}}
										onPaste={() => {
											// TODO components - implement paste functionality
										}}
									/>
								)
							}

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
						<Divider />
						<Group grow gap="xs">
							<Button
								variant="light"
								leftSection={<ClipboardPaste size={16} />}
								disabled={state.inspector.componentsClipboard.length === 0}
								onClick={() => {
									// TODO components - implement paste functionality
								}}
							>
								Paste Component
							</Button>

							<AddComponentButton
								onAddComponent={(type) => {
									const addResult = state.app?.commands.emit('add-component', {
										componentType: type,
										objectId: selectedObjectId,
									})!

									if (addResult.isOk()) {
										forceUpdate()
									} else {
										notifications.show({
											title: 'Failed to add component',
											message: `${addResult.error}`,
											color: 'red',
											autoClose: 10_000,
										})
									}
								}}
							/>
						</Group>
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
			defaultExpanded: true,
		},
		// TODO add ObjectDataSection that will allow to edit object.data (https://docs.phaser.io/api-documentation/class/data-datamanager)
	]

	const objectTypeSections = match(obj)
		.returnType<InspectorSectionDef[]>()
		.with({ type: 'Container' }, (container) => {
			// TODO prefabs: add prefab reference section (with reset and detach buttons)
			return [
				{
					type: 'obj-size',
					title: 'Size',
					icon: Scaling,
					data: container,
					content: <ContainerSizeSection data={container} />,
					defaultExpanded: true,
				},
			]
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

	const componentSections: InspectorSectionDef[] = getComponentSections(obj)

	return [...baseSections, ...objectTypeSections, ...componentSections]
}

function getComponentSections(obj: EditableObjectJson): InspectorSectionDef[] {
	return obj.components.map((component) => {
		const componentInfo = ComponentsListData[component.type]

		return match(component)
			.returnType<InspectorSectionDef>()
			.with({ type: 'pinner' }, (pinner) => {
				return {
					type: 'comp-pinner',
					title: componentInfo.title,
					icon: componentInfo.icon,
					data: pinner,
					content: <PinnerSection data={pinner} />,
					defaultExpanded: true,
				}
			})
			.with({ type: 'horizontal-layout' }, (horizontalLayout) => {
				return {
					type: 'comp-horizontal-layout',
					title: componentInfo.title,
					icon: componentInfo.icon,
					data: horizontalLayout,
					content: <HorizontalLayoutSection data={horizontalLayout} />,
					defaultExpanded: true,
				}
			})
			.with({ type: 'vertical-layout' }, (verticalLayout) => {
				return {
					type: 'comp-vertical-layout',
					title: componentInfo.title,
					icon: componentInfo.icon,
					data: verticalLayout,
					content: <VerticalLayoutSection data={verticalLayout} />,
					defaultExpanded: true,
				}
			})
			.with({ type: 'grid-layout' }, (gridLayout) => {
				return {
					type: 'comp-grid-layout',
					title: componentInfo.title,
					icon: componentInfo.icon,
					data: gridLayout,
					content: <GridLayoutSection data={gridLayout} />,
					defaultExpanded: true,
				}
			})
			.exhaustive()
	})
}
