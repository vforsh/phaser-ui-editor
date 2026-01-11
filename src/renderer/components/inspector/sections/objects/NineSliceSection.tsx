import type { EditableNineSliceJson } from '@tekton/runtime'

import { isSizeLockedForObjectJson } from '@components/canvas/phaser/scenes/main/objects/editing/editRestrictions'
import { Box, Group, Stack, TextInput, Tooltip } from '@mantine/core'
import { useSnapshot } from '@state/State'

import { useNineSliceAssets } from '../../../../hooks/useNineSliceAssets'
import { getAssetById } from '../../../../types/assets'
import { AssetPicker } from '../../../common/AssetPicker/AssetPicker'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

interface NineSliceSectionProps extends BaseSectionProps<EditableNineSliceJson> {}

export function NineSliceSection({ data }: NineSliceSectionProps) {
	const { textures, getNineSliceFrames } = useNineSliceAssets()

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
	const sizeLock = isSizeLockedForObjectJson(data)

	// TODO allow to drag and drop texture or frame from the assets panel (like in Cocos Creator)
	// TODO add button "Open in TexturePacker" if it's a spritesheet
	return (
		<Stack gap="xs">
			<AssetPicker
				label="Texture"
				assetIds={textures.map((t) => t.id)}
				selectedAssetId={texture?.id ?? null}
				onSelect={setTexture}
				onClear={() => setTexture('')}
			/>

			<AssetPicker
				label="Frame"
				assetIds={frames.map((f) => f.id)}
				selectedAssetId={frame?.id ?? null}
				onSelect={setFrame}
				onClear={() => setFrame('')}
			/>

			<Group grow>
				<Tooltip label={sizeLock?.reason} disabled={!sizeLock} withArrow position="top" openDelay={200}>
					<Box>
						<NumberInputCustom
							label="Width"
							value={snap.width}
							onChange={(value) => (data.width = value)}
							size="xs"
							decimalScale={2}
							disabled={!!sizeLock}
						/>
					</Box>
				</Tooltip>

				<Tooltip label={sizeLock?.reason} disabled={!sizeLock} withArrow position="top" openDelay={200}>
					<Box>
						<NumberInputCustom
							label="Height"
							value={snap.height}
							onChange={(value) => (data.height = value)}
							size="xs"
							decimalScale={2}
							disabled={!!sizeLock}
						/>
					</Box>
				</Tooltip>
			</Group>

			<Group grow>
				<TextInput disabled label="Left" value={snap.ninePatchConfig.left} size="xs" />
				<TextInput disabled label="Right" value={snap.ninePatchConfig.right} size="xs" />
				<TextInput disabled label="Top" value={snap.ninePatchConfig.top} size="xs" />
				<TextInput disabled label="Bottom" value={snap.ninePatchConfig.bottom} size="xs" />
			</Group>
		</Stack>
	)
}
