import { Badge, Box, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { until } from '@open-draft/until'
import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'

import { WebFontParsed } from '../../../../../backend/contract/contract'
import { backend } from '../../../../../backend/renderer/backend'
import { AssetTreeWebFontData } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { ReadonlyPropertyRow } from '../PropertyRow'

export type WebFontSectionData = Readonly<AssetTreeWebFontData>

interface WebFontSectionProps extends BaseSectionProps<WebFontSectionData> {}

export function WebFontSection({ data: asset }: WebFontSectionProps) {
	const [webFontParsed, setWebFontParsed] = useState<WebFontParsed | null>(null)
	const [fileSize, setFileSize] = useState<number | null>(null)
	const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog')
	const [previewSize, setPreviewSize] = useState(32)
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		const ac = new AbortController()

		const fetchData = async () => {
			const [parsedRes, statRes] = await Promise.all([
				until(() => backend.parseWebFont({ path: asset.path })),
				until(() => backend.stat({ path: asset.path })),
			])

			if (ac.signal.aborted) {
				return
			}

			if (parsedRes.data) {
				setWebFontParsed(parsedRes.data)
			}

			if (statRes.data) {
				setFileSize(statRes.data.size)
			}
		}

		fetchData()

		return () => ac.abort()
	}, [asset.path])

	useEffect(() => {
		if (!webFontParsed) {
			return
		}

		// Robust preview: inject @font-face
		const fontId = `web-font-preview-${asset.id}`
		let styleElement = document.getElementById(fontId) as HTMLStyleElement

		if (!styleElement) {
			styleElement = document.createElement('style')
			styleElement.id = fontId
			document.head.appendChild(styleElement)
		}

		const fontUrl = `data:font/${webFontParsed.type};base64,${webFontParsed.base64}`
		styleElement.textContent = `
			@font-face {
				font-family: "${webFontParsed.familyName}-${asset.id}";
				src: url("${fontUrl}");
			}
		`

		// Check if loaded
		const checkLoaded = async () => {
			if (document.fonts) {
				try {
					await document.fonts.load(`${previewSize}px "${webFontParsed.familyName}-${asset.id}"`)
					setIsLoaded(document.fonts.check(`${previewSize}px "${webFontParsed.familyName}-${asset.id}"`))
				} catch (e) {
					console.error('Failed to load font for preview', e)
					setIsLoaded(false)
				}
			}
		}

		checkLoaded()

		return () => {
			styleElement.remove()
		}
	}, [webFontParsed, asset.id, previewSize])

	if (!webFontParsed) {
		return null
	}

	const coverageBadges = getCoverageBadges(webFontParsed.characterSet)
	const lineHeightMultiplier = (
		(webFontParsed.ascent - webFontParsed.descent + webFontParsed.lineGap) /
		webFontParsed.unitsPerEm
	).toFixed(2)

	return (
		<Stack gap="md">
			{/* Preview Block */}
			<Stack gap="xs">
				<Box
					p="md"
					style={{
						backgroundColor: '#1A1B1E',
						borderRadius: 4,
						minHeight: 100,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						overflow: 'hidden',
					}}
				>
					<Text
						style={{
							fontFamily: `"${webFontParsed.familyName}-${asset.id}"`,
							fontSize: previewSize,
							color: 'white',
							textAlign: 'center',
							wordBreak: 'break-word',
						}}
					>
						{previewText}
					</Text>
				</Box>
				<Group grow gap="xs">
					<TextInput label="Preview Text" size="xs" value={previewText} onChange={(e) => setPreviewText(e.currentTarget.value)} />
					<NumberInput
						label="Size"
						size="xs"
						value={previewSize}
						onChange={(val) => setPreviewSize(Number(val) || 16)}
						min={8}
						max={128}
					/>
				</Group>
			</Stack>

			{/* Metadata */}
			<Stack gap="xs">
				<Text fw={500} size="sm">
					Names
				</Text>
				<Stack gap={2}>
					<ReadonlyPropertyRow label="Family" value={webFontParsed.familyName} />
					<ReadonlyPropertyRow label="Full Name" value={webFontParsed.fullName} />
					<ReadonlyPropertyRow label="Subfamily" value={webFontParsed.subfamilyName} />
					<ReadonlyPropertyRow label="PostScript" value={webFontParsed.postscriptName} />
					<ReadonlyPropertyRow label="Version" value={webFontParsed.version} />
				</Stack>
			</Stack>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					File & Status
				</Text>
				<Stack gap={2}>
					<ReadonlyPropertyRow label="Format" value={webFontParsed.type.toUpperCase()} />
					<ReadonlyPropertyRow label="Size" value={fileSize ? prettyBytes(fileSize) : '???'} />
					<ReadonlyPropertyRow label="Loaded" value={isLoaded ? 'Yes' : 'No'} />
				</Stack>
			</Stack>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					Coverage
				</Text>
				<Group gap={4}>
					{coverageBadges.map((badge) => (
						<Badge key={badge} size="xs" variant="flat" color="blue">
							{badge}
						</Badge>
					))}
				</Group>
				<Stack gap={2}>
					<ReadonlyPropertyRow label="Glyphs" value={webFontParsed.numGlyphs} />
					<ReadonlyPropertyRow label="Characters" value={webFontParsed.characterSet.length} />
				</Stack>
			</Stack>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					Metrics
				</Text>
				<Stack gap={2}>
					<ReadonlyPropertyRow label="Units per Em" value={webFontParsed.unitsPerEm} />
					<ReadonlyPropertyRow label="Ascent" value={webFontParsed.ascent} />
					<ReadonlyPropertyRow label="Descent" value={webFontParsed.descent} />
					<ReadonlyPropertyRow label="Line Gap" value={webFontParsed.lineGap} />
					<ReadonlyPropertyRow label="Line Height" value={`${lineHeightMultiplier}x`} />
					{webFontParsed.capHeight !== undefined && <ReadonlyPropertyRow label="Cap Height" value={webFontParsed.capHeight} />}
					{webFontParsed.xHeight !== undefined && <ReadonlyPropertyRow label="x-Height" value={webFontParsed.xHeight} />}
					<ReadonlyPropertyRow label="Italic Angle" value={`${webFontParsed.italicAngle}°`} />
				</Stack>
			</Stack>

			{renderFeatures(webFontParsed.availableFeatures)}
		</Stack>
	)
}

function getCoverageBadges(characterSet: number[]): string[] {
	const badges: string[] = []
	const set = new Set(characterSet)

	const hasRange = (start: number, end: number) => {
		for (let i = start; i <= end; i++) {
			if (set.has(i)) return true
		}
		return false
	}

	if (hasRange(0x0020, 0x007e)) badges.push('Latin')
	if (hasRange(0x0030, 0x0039)) badges.push('Digits')
	if (hasRange(0x00a0, 0x00ff)) badges.push('Latin-1')
	if (hasRange(0x0400, 0x04ff)) badges.push('Cyrillic')
	if (hasRange(0x0370, 0x03ff)) badges.push('Greek')
	if (hasRange(0x20a0, 0x20cf)) badges.push('Currency')

	return badges
}

function renderFeatures(features: unknown) {
	let featureList: string[] = []

	if (Array.isArray(features)) {
		featureList = features.filter((f) => typeof f === 'string')
	} else if (typeof features === 'object' && features !== null) {
		featureList = Object.keys(features)
	}

	if (featureList.length === 0) {
		return null
	}

	return (
		<Stack gap="xs">
			<Text fw={500} size="sm">
				OpenType Features
			</Text>
			<Group gap={4}>
				{featureList.map((tag) => (
					<Badge key={tag} size="xs" variant="outline" color="gray" title={tag}>
						{tag}
					</Badge>
				))}
			</Group>
		</Stack>
	)
}
