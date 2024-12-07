import { Box, Image, Stack, Text } from '@mantine/core'
import { randomInt } from 'es-toolkit'
import path from 'path-browserify'
import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'
import trpc from '../../trpc'
import { GraphicAssetData } from '../../types/assets'

interface GraphicAssetPreviewProps {
	asset: GraphicAssetData
}

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

function createImageUrl(imageData: number[], type = 'image/png') {
	const blob = new Blob([new Uint8Array(imageData)], { type })
	const url = URL.createObjectURL(blob)
	return url
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

export function GraphicAssetPreview({ asset }: GraphicAssetPreviewProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [imageFileSize, setImageFileSize] = useState<number | null>(null)
	const imageDimensions = getImageDimensions(asset)

	// fetch image url
	useEffect(() => {
		// TODO remove later
		if (BOLT) {
			setImageUrl(getImageUrlForBolt())
			return
		}

		const ac = new AbortController()

		const fetchData = async () => {
			const imageData = await readImageData(asset, ac.signal)
			const imageType = detectImageType(asset)
			const imageUrl = createImageUrl(imageData.data, imageType)
			setImageUrl(imageUrl)
		}

		fetchData()

		return () => ac.abort()
	}, [asset])

	// fetch image file size
	useEffect(() => {
		// TODO remove later
		if (BOLT) {
			setImageFileSize(randomInt(1000, 1000000))
			return
		}

		const ac = new AbortController()

		const fetchData = async () => {
			const imageFileSize = await getImageFileSize(asset, ac.signal)
			setImageFileSize(imageFileSize)
		}

		fetchData()

		return () => ac.abort()
	}, [asset])

	return (
		<Stack gap="md">
			<Box
				style={{
					aspectRatio: '1',
					overflow: 'hidden',
					borderRadius: 4,
					backgroundColor: '#1A1B1E',
				}}
			>
				{imageUrl && <Image src={imageUrl} alt={asset.name} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />}
			</Box>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					Metadata
				</Text>
				<Stack gap={4}>
					<MetadataRow label="Dimensions" value={`${imageDimensions.w} × ${imageDimensions.h}px`} />
					<MetadataRow label="Size" value={imageFileSize ? prettyBytes(imageFileSize) : '???'} />
					<MetadataRow label="Type" value={asset.type} />
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
