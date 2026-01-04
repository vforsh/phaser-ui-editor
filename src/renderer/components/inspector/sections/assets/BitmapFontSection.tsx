import { BmFontChar, BmFontData } from '@components/canvas/phaser/robowhale/phaser3/gameObjects/bitmap-text/create-bmfont-data'
import { Group, NumberInput, Stack, Textarea, TextInput } from '@mantine/core'
import { until } from '@open-draft/until'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import { backend } from '../../../../../backend/renderer/backend'
import { AssetTreeBitmapFontData } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'

export type BitmapFontSectionData = Readonly<AssetTreeBitmapFontData>

interface BitmapFontSectionProps extends BaseSectionProps<BitmapFontSectionData> {}

export function BitmapFontSection({ data: asset }: BitmapFontSectionProps) {
	let [fontData, setFontData] = useState<BmFontData | null>(null)

	useEffect(() => {
		const ac = new AbortController()

		const fetchData = async () => {
			const { error, data } = await until(() => loadFontData(asset.data, ac.signal))
			if (error) {
				if (error.message.includes('aborted')) {
					return
				}

				throw error
			}

			setFontData(data)
		}

		fetchData()

		return () => ac.abort()
	}, [asset])

	if (!fontData) {
		return null
	}

	const chars = (Array.isArray(fontData.chars) ? fontData.chars : fontData.chars.list) as BmFontChar[]

	return (
		<Stack gap="xs">
			<TextInput label="Font Face" value={fontData.info.face} size="xs" readOnly />

			<Textarea rows={3} label="Chars" value={chars.map((char) => String.fromCharCode(char.id)).join('')} size="xs" readOnly />

			<Group>
				<NumberInput label="Size" value={fontData.info.size} size="xs" readOnly />
				<NumberInput label="Line Height" value={fontData.common.lineHeight} size="xs" readOnly />
			</Group>

			<Group grow>
				<NumberInput label="Pad Up" value={fontData.info.padding[0]} size="xs" readOnly />
				<NumberInput label="Pad Right" value={fontData.info.padding[1]} size="xs" readOnly />
				<NumberInput label="Pad Down" value={fontData.info.padding[2]} size="xs" readOnly />
				<NumberInput label="Pad Left" value={fontData.info.padding[3]} size="xs" readOnly />
			</Group>

			<Group grow>
				<NumberInput label="Spacing X" value={fontData.info.spacing[0]} size="xs" readOnly />
				<NumberInput label="Spacing Y" value={fontData.info.spacing[1]} size="xs" readOnly />
			</Group>
		</Stack>
	)
}

async function loadFontData(data: AssetTreeBitmapFontData['data'], ac: AbortSignal): Promise<BmFontData> {
	return match(data)
		.with({ type: 'json' }, (data) => backend.readJson({ path: data.path }) as Promise<BmFontData>)
		.with({ type: 'xml' }, (data) => backend.readBmfontXml({ path: data.path }) as Promise<BmFontData>)
		.exhaustive()
}
