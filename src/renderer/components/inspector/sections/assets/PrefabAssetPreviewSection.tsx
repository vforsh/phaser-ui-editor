import { Box, Image, Stack, Text } from '@mantine/core'
import { until } from '@open-draft/until'
import { state, useSnapshot } from '@state/State'
import { useEffect, useState } from 'react'

import { AssetTreePrefabData, fetchPrefabThumbnailUrl } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'

export type PrefabAssetPreviewSectionData = Readonly<AssetTreePrefabData>

export interface PrefabAssetPreviewSectionProps extends BaseSectionProps<PrefabAssetPreviewSectionData> {}

export function PrefabAssetPreviewSection({ data }: PrefabAssetPreviewSectionProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const assetsSnap = useSnapshot(state.assets)
	const thumbnailUpdatedAt = assetsSnap.prefabThumbnailUpdatedAt[data.id] ?? 0

	useEffect(() => {
		const ac = new AbortController()

		const fetchThumbnail = async () => {
			setIsLoading(true)
			const { error, data: url } = await until(() => fetchPrefabThumbnailUrl(data, ac.signal))
			if (error || ac.signal.aborted) {
				return
			}

			setImageUrl(url)
			setIsLoading(false)
		}

		fetchThumbnail()

		return () => ac.abort()
	}, [data, thumbnailUpdatedAt])

	useEffect(() => {
		return () => {
			if (imageUrl) {
				URL.revokeObjectURL(imageUrl)
			}
		}
	}, [imageUrl])

	return (
		<Stack gap="md" data-testid="prefab-asset-preview">
			<Box
				style={{
					aspectRatio: '1',
					overflow: 'hidden',
					borderRadius: 4,
					backgroundColor: '#1A1B1E',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				{imageUrl ? (
					<Image src={imageUrl} alt={data.name} style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
				) : (
					<Text size="sm" c="dimmed" ta="center" p="md">
						{isLoading ? 'Loading...' : 'No thumbnail yet.\nSave prefab to generate.'}
					</Text>
				)}
			</Box>
		</Stack>
	)
}
