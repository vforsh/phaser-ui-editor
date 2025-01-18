import { EditableNineSliceJson } from '@components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { Group, NumberInput, Select, Stack } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import {
	AssetTreeImageData,
	AssetTreeSpritesheetData,
	getAssetById,
	getAssetRelativePath,
	getAssetsOfType,
} from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface NineSliceSectionProps extends BaseSectionProps<EditableNineSliceJson> {}

export function NineSliceSection({ data }: NineSliceSectionProps) {
	const stateSnap = useSnapshot(state)

	const images = getAssetsOfType(stateSnap.assets as State['assets'], 'image').filter((item) =>
		isNineSliceImage(item)
	)
	const spritesheets = getAssetsOfType(stateSnap.assets as State['assets'], 'spritesheet').filter((item) =>
		hasNineSliceFrames(item)
	)
	const textures = [...images, ...spritesheets]
	const texture = textures.find((texture) => texture.path.endsWith(data.textureKey))

	const frames = texture?.type === 'spritesheet' ? getNineSliceFrames(texture) : []
	const frame = frames.find((frame) => frame.pathInHierarchy === data.frameKey)

	const setTexture = (textureId: string) => {
		console.log(`setTexture ${textureId}`)

		// TODO change EditableImage texture
		// - make sure that the texture is loaded
		// - disable the section while the texture is loading
		// - don't forget to update the frameKey in the state object
	}

	const setFrame = (frameId: string) => {
		const frame = getAssetById(frames, frameId)
		if (frame && frame.type === 'spritesheet-frame') {
			data.frameKey = frame.pathInHierarchy
		}
	}

	const snap = useSnapshot(data)

	// TODO allow to drag and drop texture or frame from the assets panel (like in Cocos Creator)
	// TODO add button "Open in TexturePacker" if it's a spritesheet
	return (
		<Stack gap="xs">
			<Select
				label="Texture"
				value={texture?.id}
				onChange={(value) => value && setTexture(value)}
				data={textures.map((texture) => {
					const relPath = getAssetRelativePath(texture.path)
					return { label: `${relPath} (${texture.type})`, value: texture.id }
				})}
				size="xs"
			/>

			<Select
				label="Frame"
				value={frame?.id}
				onChange={(value) => value && setFrame(value)}
				data={frames.map((frame) => ({ label: frame.pathInHierarchy, value: frame.id }))}
				size="xs"
			/>

			<Group grow>
				<NumberInputCustom
					label="Width"
					value={snap.width}
					onChange={(value) => (data.width = value)}
					size="xs"
				/>

				<NumberInputCustom
					label="Height"
					value={snap.height}
					onChange={(value) => (data.height = value)}
					size="xs"
				/>
			</Group>

			<Group grow>
				<NumberInput
					disabled
					label="Left"
					value={snap.ninePatchConfig.left}
					// onChange={(value) => (data.ninePatchConfig.left = value)}
					size="xs"
				/>
				<NumberInput
					disabled
					label="Right"
					value={snap.ninePatchConfig.right}
					// onChange={(value) => (data.ninePatchConfig.right = value)}
					size="xs"
				/>
				<NumberInput
					disabled
					label="Top"
					value={snap.ninePatchConfig.top}
					// onChange={(value) => (data.ninePatchConfig.top = value)}
					size="xs"
				/>
				<NumberInput
					disabled
					label="Bottom"
					value={snap.ninePatchConfig.bottom}
					// onChange={(value) => (data.ninePatchConfig.bottom = value)}
					size="xs"
				/>
			</Group>
		</Stack>
	)
}

function isNineSliceImage(image: AssetTreeImageData) {
	return image.scale9Borders !== undefined
}

function hasNineSliceFrames(spritesheet: AssetTreeSpritesheetData) {
	return getAssetsOfType(spritesheet.frames, 'spritesheet-frame').some((frame) => frame.scale9Borders !== undefined)
}

function getNineSliceFrames(texture: AssetTreeSpritesheetData) {
	return getAssetsOfType(texture.frames, 'spritesheet-frame')
		.filter((frame) => frame.scale9Borders !== undefined)
		.sort()
}
