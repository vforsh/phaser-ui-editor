import { Stack, TextInput } from '@mantine/core'

interface ImageProps {
	texture: string
	frame?: string
}

interface ImageSectionProps {
	props: ImageProps
	onChange: (properties: Partial<ImageProps>) => void
}

export function ImageSection({ props, onChange }: ImageSectionProps) {
	// TODO allow to select texture from the list of available textures
	// TODO allow to select frame from the list of available frames
	// TODO allow to drag and drop texture or frame from the assets panel (like in Cocos Creator)
	return (
		<Stack gap="xs">
			<TextInput
				label="Texture"
				value={props.texture}
				onChange={(e) => onChange({ texture: e.currentTarget.value })}
				size="xs"
			/>

			<TextInput
				label="Frame"
				value={props.frame}
				onChange={(e) => onChange({ frame: e.currentTarget.value })}
				size="xs"
			/>
		</Stack>
	)
}
