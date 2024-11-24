import { Center, Text } from '@mantine/core'
import { useState } from 'react'
import type { FileItem } from '../types/files'
import AlignmentControls from './AlignmentControls'
import ZoomControls from './ZoomControls'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.1

export default function Canvas() {
	const [isDragOver, setIsDragOver] = useState(false)
	const [zoom, setZoom] = useState(1)

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(true)
	}

	const handleDragLeave = () => {
		setIsDragOver(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)

		try {
			const item = JSON.parse(e.dataTransfer.getData('application/json')) as FileItem
			if (item.type === 'image') {
				console.log('Image dropped at:', {
					x: e.clientX,
					y: e.clientY,
					item,
				})
			}
		} catch (error) {
			console.error('Invalid drop data')
		}
	}

	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
	}

	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
	}

	const handleZoomReset = () => {
		setZoom(1)
	}

	const handleZoomFit = () => {
		// TODO: Implement fit to view logic
		setZoom(1)
	}

	// Horizontal alignment handlers
	const handleAlignLeft = () => {
		console.log('Align left')
	}

	const handleAlignHorizontalCenter = () => {
		console.log('Align horizontal center')
	}

	const handleAlignRight = () => {
		console.log('Align right')
	}

	// Vertical alignment handlers
	const handleAlignTop = () => {
		console.log('Align top')
	}

	const handleAlignVerticalCenter = () => {
		console.log('Align vertical center')
	}

	const handleAlignBottom = () => {
		console.log('Align bottom')
	}

	return (
		<div
			id="canvas-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				transition: 'all 200ms ease',
				background: isDragOver ? 'rgba(51, 102, 255, 0.05)' : '#242424',
				borderRadius: 'inherit',
				overflow: 'hidden',
			}}
		>
			<ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} onFit={handleZoomFit} />

			<AlignmentControls
				orientation="horizontal"
				onAlignStart={handleAlignLeft}
				onAlignCenter={handleAlignHorizontalCenter}
				onAlignEnd={handleAlignRight}
			/>

			<AlignmentControls
				orientation="vertical"
				onAlignStart={handleAlignTop}
				onAlignCenter={handleAlignVerticalCenter}
				onAlignEnd={handleAlignBottom}
			/>

			<Center h="100%">
				<Text c="dimmed" fs="italic" style={{ userSelect: 'none' }}>
					Drag and drop images here
				</Text>
			</Center>
		</div>
	)
}
