import { Center, Text } from '@mantine/core'
import { isEmpty } from 'lodash-es'
import { useRef, useState } from 'react'
import { AppCommands } from '../../AppCommands'
import { AppEvents } from '../../AppEvents'
import { state, useSnapshot } from '../../state/State'
import type { AssetTreeItemData } from '../../types/assets'
import AlignmentControls from './AlignmentControls'
import { Canvas } from './Canvas'
import { TypedEventEmitter } from './phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './phaser/robowhale/utils/events/CommandEmitter'
import ZoomControls from './ZoomControls'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.1

interface DropPreview {
	x: number
	y: number
	width: number
	height: number
}

export default function CanvasContainer() {
	const containerRef = useRef<HTMLDivElement>(null)
	const [isDragOver, setIsDragOver] = useState(false)
	const [zoom, setZoom] = useState(1)
	const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)
	const snap = useSnapshot(state)

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(true)

		try {
			const item = JSON.parse(e.dataTransfer.getData('application/json')) as AssetTreeItemData
			if (item.type === 'spritesheet-frame') {
				const rect = containerRef.current?.getBoundingClientRect()
				if (rect) {
					const x = e.clientX - rect.left
					const y = e.clientY - rect.top
					setDropPreview({
						x,
						y,
						width: item.size.w,
						height: item.size.h,
					})
				}
			}
		} catch (error) {
			// Invalid drag data, ignore
		}
	}

	const handleDragLeave = () => {
		setIsDragOver(false)
		setDropPreview(null)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
		setDropPreview(null)

		try {
			const item = JSON.parse(e.dataTransfer.getData('application/json')) as AssetTreeItemData
			if (item.type === 'image' || item.type === 'spritesheet-frame') {
				const rect = containerRef.current?.getBoundingClientRect()
				if (rect) {
					const x = e.clientX - rect.left
					const y = e.clientY - rect.top
					console.log('Asset dropped:', {
						item,
						position: { x, y },
					})
					// TODO: Add item to Phaser scene at position
				}
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
			ref={containerRef}
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
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			{snap.project && !isEmpty(snap.project) && snap.app?.events && snap.app?.commands && (
				<Canvas
					projectConfig={snap.project}
					appEvents={snap.app.events as TypedEventEmitter<AppEvents>}
					appCommands={snap.app.commands as CommandEmitter<AppCommands>}
				/>
			)}

			{dropPreview && (
				<div
					style={{
						position: 'absolute',
						left: dropPreview.x,
						top: dropPreview.y,
						width: dropPreview.width,
						height: dropPreview.height,
						border: '2px dashed #3399ff',
						borderRadius: '4px',
						backgroundColor: 'rgba(51, 102, 255, 0.1)',
						pointerEvents: 'none',
						transition: 'all 100ms ease',
					}}
				/>
			)}

			{/* <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} onFit={handleZoomFit} /> */}

			{/* <AlignmentControls
				orientation="horizontal"
				onAlignStart={handleAlignLeft}
				onAlignCenter={handleAlignHorizontalCenter}
				onAlignEnd={handleAlignRight}
			/> */}

			{/* <AlignmentControls
				orientation="vertical"
				onAlignStart={handleAlignTop}
				onAlignCenter={handleAlignVerticalCenter}
				onAlignEnd={handleAlignBottom}
			/> */}

			{isDragOver && !dropPreview && (
				<Center h="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
					<Text c="dimmed" fs="italic" style={{ userSelect: 'none' }}>
						Drop image here
					</Text>
				</Center>
			)}
		</div>
	)
}
