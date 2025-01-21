import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { Group, NumberInput, Select, Stack, TextInput } from '@mantine/core'
import { state, State, useSnapshot } from '@state/State'
import { uniq } from 'es-toolkit'
import { getAssetsOfType } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'

const ALIGN_OPTIONS = [
	{ value: 0, label: 'Left' },
	{ value: 1, label: 'Middle' },
	{ value: 2, label: 'Right' },
] as const

type AlignType = (typeof ALIGN_OPTIONS)[number]['value']

interface BitmapTextSectionProps extends BaseSectionProps<EditableBitmapTextJson> {}

async function loadFontData(fontDataPath: string | undefined) {
	// if (!fontDataPath) return null
	// const response = await fetch(fontDataPath)
	// return response.json()
	return Promise.resolve({
		chars: ['a', 'b', 'c'],
	})
}

export function BitmapTextSection({ data }: BitmapTextSectionProps) {
	const assetsSnap = useSnapshot(state.assets.items)
	const fontAssets = getAssetsOfType(assetsSnap as State['assets']['items'], 'bitmap-font')
	const fontNames = uniq(fontAssets.map((asset) => asset.name)).sort()

	const snap = useSnapshot(data)

	// const fontDataPath = useMemo(
	// 	() => fontAssets.find((asset) => asset.name === snap.font)?.data.path,
	// 	[fontAssets, snap.font]
	// )

	// const { data: fontData, isLoading, error } = useAsync(() => loadFontData(fontDataPath), true)

	return (
		<Stack gap="xs">
			{/* {isLoading && (
				<Text size="xs" c="dimmed">
					Loading font data...
				</Text>
			)} */}

			{/* {error && (
				<Text size="xs" c="red">
					Error loading font data
				</Text>
			)} */}

			<TextInput
				label="Content"
				value={snap.text}
				onChange={(e) => (data.text = e.currentTarget.value)}
				size="xs"
			/>

			<Group grow>
				<Select
					label="Font"
					value={snap.font}
					// TODO handle font change
					// - emit command to load the font
					// - display a loading indicator
					onChange={(value) => value !== null && (data.font = value)}
					data={fontNames.map((font) => ({ label: font, value: font }))}
					size="xs"
				/>

				<NumberInputCustom
					label="Font Size"
					value={snap.fontSize}
					onChange={(value) => (data.fontSize = value)}
					min={1}
					step={1}
					size="xs"
				/>
			</Group>

			<Select
				label="Text Align"
				value={snap.align.toString()}
				onChange={(value) => (data.align = Number(value) as AlignType)}
				data={ALIGN_OPTIONS.map((option) => ({ label: option.label, value: option.value.toString() }))}
				size="xs"
			/>

			<NumberInput
				label="Max Width"
				value={snap.maxWidth}
				onChange={(value) => (data.maxWidth = value as number)}
				min={0}
				step={10}
				size="xs"
			/>

			<Group grow>
				<NumberInputCustom
					label="Letter Spacing"
					value={snap.letterSpacing}
					onChange={(value) => (data.letterSpacing = value as number)}
					step={1}
					size="xs"
				/>

				<NumberInputCustom
					label="Line Spacing"
					value={snap.lineSpacing}
					onChange={(value) => (data.lineSpacing = value as number)}
					step={1}
					size="xs"
				/>
			</Group>

			{/* {fontData && <pre>{JSON.stringify(fontData, null, 2)}</pre>} */}
		</Stack>
	)
}
