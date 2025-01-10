import { Select, Stack } from '@mantine/core'
import { State, state, useSnapshot } from '@state/State'
import path from 'path-browserify-esm'
import { getAssetsOfType } from '../../../../types/assets'

interface ImageProps {
	texture: string
	frame?: string
}

interface ImageSectionProps {
	data: ImageProps
	onChange: (properties: Partial<ImageProps>) => void
}

export function ImageSection({ data, onChange }: ImageSectionProps) {
	const snap = useSnapshot(state)

	const images = getAssetsOfType(snap.assets as State['assets'], 'image')
	const spritesheets = getAssetsOfType(snap.assets as State['assets'], 'spritesheet')
	const textures = [...images, ...spritesheets]

	const spritesheet = spritesheets.find((spritesheet) =>
		spritesheet.frames.some((frame) => frame.name === data.frame)
	)
	const frames = spritesheet ? spritesheet.frames.map((frame) => frame.name) : []

	// TODO allow to drag and drop texture or frame from the assets panel (like in Cocos Creator)
	// TODO add button "Open in TexturePacker" if it's a spritesheet
	return (
		<Stack gap="xs">
			<Select
				label="Texture"
				// value={data.texture}
				value={textures[0].id}
				onChange={(value) => value && onChange({ texture: value })}
				data={textures.map((texture) => {
					const assetsDir = path.join(snap.projectDir!, snap.project!.assetsDir)
					path.setCWD(assetsDir)
					const relPath = path.relative(assetsDir, texture.path)
					return { label: `${relPath} (${texture.type})`, value: texture.id }
				})}
				size="xs"
			/>

			<Select
				label="Frame"
				// value={data.frame}
				value={frames[0]}
				onChange={(value) => value && onChange({ frame: value })}
				data={frames.map((frame) => ({ label: frame, value: frame }))}
				size="xs"
			/>
		</Stack>
	)
}
