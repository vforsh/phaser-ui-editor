import { EditableBitmapTextJson } from '@components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { Group, Stack } from '@mantine/core'
import { state, State, useSnapshot } from '@state/State'
import { uniq } from 'es-toolkit'
import { getAssetById, getAssetsOfType } from '../../../../types/assets'
import { AssetPicker } from '../../../common/AssetPicker/AssetPicker'
import { BaseSectionProps } from '../BaseSection'
import { NumberInputCustom } from '../common/NumberInputCustom'
import { SelectCustom } from '../common/SelectCustom'
import { TextareaCustom } from '../common/TextareaCustom'

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
	const selectedFont = fontAssets.find((asset) => asset.name === data.font)

	const snap = useSnapshot(data)

	const setFont = (fontId: string) => {
		const font = getAssetById(fontAssets, fontId)
		if (!font) return
		data.font = font.name
	}

	const clearFont = () => {
		data.font = ''
	}

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

			<TextareaCustom
				rows={3}
				label="Content"
				value={snap.text}
				onChange={(e) => (data.text = e.currentTarget.value)}
				size="xs"
			/>

			<Group grow>
				<AssetPicker
					modalTitle="Select bitmap font"
					label="Font"
					assetIds={fontAssets.map((f) => f.id)}
					selectedAssetId={selectedFont?.id ?? null}
					onSelect={setFont}
					onClear={clearFont}
					onLocate={() => console.log(`locate font in AssetsPanel`)}
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

			<SelectCustom
				label="Text Align"
				value={snap.align.toString()}
				onChange={(value) => (data.align = Number(value) as AlignType)}
				data={ALIGN_OPTIONS.map((option) => ({ label: option.label, value: option.value.toString() }))}
				size="xs"
			/>

			<NumberInputCustom
				label="Max Width"
				value={snap.maxWidth}
				onChange={(value) => (data.maxWidth = value as number)}
				min={0}
				step={1}
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
