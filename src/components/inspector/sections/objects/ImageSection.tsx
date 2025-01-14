import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { Select, Stack } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import { getAssetById, getAssetRelativePath, getAssetsOfType } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'

interface ImageSectionProps extends BaseSectionProps<EditableImageJson> {}

export function ImageSection({ data }: ImageSectionProps) {
	const stateSnap = useSnapshot(state)

	const images = getAssetsOfType(stateSnap.assets as State['assets'], 'image')
	const spritesheets = getAssetsOfType(stateSnap.assets as State['assets'], 'spritesheet')
	const textures = [...images, ...spritesheets]
	const texture = textures.find((texture) => texture.path.endsWith(data.textureKey))

	const frames = texture?.type === 'spritesheet' ? getAssetsOfType(texture.frames, 'spritesheet-frame').sort() : []
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
		</Stack>
	)
}
