import { Box, Image, Stack, Text } from '@mantine/core'
import { until } from '@open-draft/until'
import { randomInt } from 'es-toolkit'
import path from 'path-browserify-esm'
import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'
import trpc from '../../../../trpc'
import { GraphicAssetData } from '../../../../types/assets'
import { imageDataToUrl } from '../../../../utils/image-data-to-url'
import { BaseSectionProps } from '../BaseSection'

export type GraphicAssetPreviewSectionData = Readonly<GraphicAssetData>

function getImageUrlForBolt(): string {
	const seeds = ['game-asset', 'pixel-art', 'game-sprite', 'game-texture', 'game-ui']

	const seed = seeds[Math.floor(Math.random() * seeds.length)]

	return `https://source.unsplash.com/featured/512x512?${seed}`
}

function readImageData(asset: GraphicAssetData, signal?: AbortSignal) {
	return match(asset)
		.with({ type: 'image' }, async (image) => {
			return trpc.readFile.query({ path: image.path }, { signal })
		})
		.with({ type: 'spritesheet' }, async (spritesheet) => {
			return trpc.readFile.query({ path: spritesheet.image.path }, { signal })
		})
		.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
			return trpc.readSpritesheetFrame.query(
				{ spritesheetPath: spritesheetFrame.imagePath, frameName: spritesheetFrame.pathInHierarchy },
				{ signal }
			)
		})
		.with({ type: 'bitmap-font' }, async (bitmapFont) => {
			return trpc.readFile.query({ path: bitmapFont.image.path }, { signal })
		})
		.exhaustive()
}

function detectImageType(asset: GraphicAssetData) {
	const imgPath = match(asset)
		.with({ type: 'image' }, (image) => image.path)
		.with({ type: 'spritesheet' }, (spritesheet) => spritesheet.image.path)
		.with({ type: 'spritesheet-frame' }, (spritesheetFrame) => spritesheetFrame.imagePath)
		.with({ type: 'bitmap-font' }, (bitmapFont) => bitmapFont.image.path)
		.exhaustive()

	const imgExt = path.extname(imgPath).slice(1)

	switch (imgExt) {
		case 'png':
			return 'image/png'
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg'
		case 'webp':
			return 'image/webp'
		case 'avif':
			return 'image/avif'
		default:
			throw new Error(`Unsupported image type: ${imgExt}`)
	}
}

/**
 * Returns the file size of the image in bytes
 */
async function getImageFileSize(asset: GraphicAssetData, signal?: AbortSignal) {
	const stats = await match(asset)
		.with({ type: 'image' }, async (image) => {
			return trpc.stat.query({ path: image.path }, { signal })
		})
		.with({ type: 'spritesheet' }, async (spritesheet) => {
			return trpc.stat.query({ path: spritesheet.image.path }, { signal })
		})
		.with({ type: 'spritesheet-frame' }, async (spritesheetFrame) => {
			return { size: 0 }
		})
		.with({ type: 'bitmap-font' }, async (bitmapFont) => {
			return trpc.stat.query({ path: bitmapFont.image.path }, { signal })
		})
		.exhaustive()

	return stats.size
}

function getImageDimensions(asset: GraphicAssetData) {
	return match(asset)
		.with({ type: 'image' }, (image) => image.size)
		.with({ type: 'spritesheet' }, (spritesheet) => spritesheet.image.size)
		.with({ type: 'spritesheet-frame' }, (spritesheetFrame) => spritesheetFrame.size)
		.with({ type: 'bitmap-font' }, (bitmapFont) => bitmapFont.image.size)
		.exhaustive()
}

export interface GraphicAssetPreviewSectionProps extends BaseSectionProps<GraphicAssetPreviewSectionData> {}

export function GraphicAssetPreviewSection({ data }: GraphicAssetPreviewSectionProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [imageFileSize, setImageFileSize] = useState<number | null>(null)
	const imageDimensions = getImageDimensions(data)

	// fetch image url
	useEffect(() => {
		// TODO remove later
		if (BOLT) {
			setImageUrl(getImageUrlForBolt())
			return
		}

		const ac = new AbortController()

		const fetchData = async () => {
			const { data: imageData, error } = await until(() => readImageData(data, ac.signal))
			if (error) {
				if (error.message.includes('aborted')) {
					return
				}

				throw error
			}

			const imageType = detectImageType(data)
			const imageUrl = imageDataToUrl(imageData.data, imageType)
			setImageUrl(imageUrl)
		}

		fetchData()

		return () => ac.abort()
	}, [data])

	// fetch image file size
	useEffect(() => {
		// TODO remove later
		if (BOLT) {
			setImageFileSize(randomInt(1000, 1000000))
			return
		}

		const ac = new AbortController()

		const fetchData = async () => {
			const { error, data: size } = await until(() => getImageFileSize(data, ac.signal))
			if (error) {
				if (error.message.includes('aborted')) {
					return
				}

				throw error
			}

			setImageFileSize(size)
		}

		fetchData()

		return () => ac.abort()
	}, [data])

	return (
		<Stack gap="md">
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
				{imageUrl && (
					<Image
						src={imageUrl}
						alt={data.name}
						style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
					/>
				)}
			</Box>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					Metadata
				</Text>
				<Stack gap={4}>
					<MetadataRow label="Dimensions" value={`${imageDimensions.w} × ${imageDimensions.h}px`} />
					<MetadataRow label="Size" value={imageFileSize ? prettyBytes(imageFileSize) : '???'} />
				</Stack>
			</Stack>
		</Stack>
	)
}

interface MetadataRowProps {
	label: string
	value: string
}

function MetadataRow({ label, value }: MetadataRowProps) {
	return (
		<div style={{ display: 'flex', justifyContent: 'space-between' }}>
			<Text size="sm" c="dimmed">
				{label}
			</Text>
			<Text size="sm">{value}</Text>
		</div>
	)
}
