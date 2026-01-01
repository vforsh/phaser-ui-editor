import { EditableImageJson } from '@components/canvas/phaser/scenes/main/objects/EditableImage'
import { Button, Stack, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { State, state, useSnapshot } from '@state/State'
import { getAssetById, getAssetsOfType } from '../../../../types/assets'
import { AssetPicker } from '../../../common/AssetPicker/AssetPicker'
import { BaseSectionProps } from '../BaseSection'
import { useAppCommands } from '../../../../di/DiContext'

interface ImageSectionProps extends BaseSectionProps<EditableImageJson> {}

export function ImageSection({ data }: ImageSectionProps) {
	const assetsSnap = useSnapshot(state.assets.items)
	const appCommands = useAppCommands()

	const images = getAssetsOfType(assetsSnap as State['assets']['items'], 'image')
	const spritesheets = getAssetsOfType(assetsSnap as State['assets']['items'], 'spritesheet')
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

	const clearTexture = () => {
		data.textureKey = ''
		data.frameKey = ''
	}

	const setFrame = (frameId: string) => {
		const frame = getAssetById(frames, frameId)
		if (frame && frame.type === 'spritesheet-frame') {
			data.frameKey = frame.pathInHierarchy
		}
	}

	const clearFrame = () => {
		data.frameKey = ''
	}

	const resetAsset = getAssetById(assetsSnap as State['assets']['items'], data.asset.id)
	const canResetOriginalSize =
		(resetAsset?.type === 'image' || resetAsset?.type === 'spritesheet-frame') &&
		resetAsset.size?.w > 0 &&
		resetAsset.size?.h > 0

	// TODO allow to drag and drop texture or frame from the assets panel (like in Cocos Creator)
	// TODO add button "Open in TexturePacker" if it's a spritesheet
	return (
		<Stack gap="xs">
			<AssetPicker
				label="Texture"
				assetIds={textures.map((t) => t.id)}
				selectedAssetId={texture?.id ?? null}
				onSelect={setTexture}
				onClear={clearTexture}
			/>

			<AssetPicker
				label="Frame"
				assetIds={frames.map((f) => f.id)}
				selectedAssetId={frame?.id ?? null}
				onSelect={setFrame}
				onClear={clearFrame}
				error={texture?.type === 'spritesheet' && !frame ? 'Frame not found' : undefined}
			/>

			<Button
				variant="light"
				size="xs"
				mt="xs"
				disabled={!canResetOriginalSize}
				onClick={() => appCommands.emit('reset-image-original-size', { objectId: data.id })}
				rightSection={
					<Tooltip label="Resets size to asset's original texture size.">
						<Info size={14} />
					</Tooltip>
				}
			>
				Reset Original Size
			</Button>
		</Stack>
	)
}
