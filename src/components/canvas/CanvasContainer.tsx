import { Center, Text } from '@mantine/core'
import { useMemo, useRef, useState } from 'react'
import { useAppCommands, useAppEvents, useUndoHub } from '../../di/DiContext'
import { state, useSnapshot } from '../../state/State'
import { isDraggableAsset, type AssetTreeItemData } from '../../types/assets'
import AlignmentControls from './AlignmentControls'
import { Canvas } from './Canvas'

interface DropPreview {
	x: number
	y: number
	width: number
	height: number
}

export default function CanvasContainer() {
	const containerRef = useRef<HTMLDivElement>(null)
	const [isDragOver, setIsDragOver] = useState(false)
	const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)
	const snap = useSnapshot(state)
	const appEvents = useAppEvents()
	const appCommands = useAppCommands()
	const undoHub = useUndoHub()

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
		} catch {
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
			const isDraggable = isDraggableAsset(item.type)
			if (!isDraggable) {
				return
			}

			const rect = containerRef.current?.getBoundingClientRect()
			if (rect) {
				const x = e.clientX - rect.left
				const y = e.clientY - rect.top

				appCommands.emit('handle-asset-drop', {
					asset: item,
					position: { x, y },
				})
			}
		} catch {
			console.error('Invalid drop data')
		}
	}

	// use memo to prevent re-rendering of the canvas element
	const canvas = useMemo(() => {
		// Only create canvas if we have all required props
		if (!snap.project || !snap.assets) {
			return null
		}

		return (
			<Canvas
				projectConfig={snap.project}
				appEvents={appEvents}
				appCommands={appCommands}
				undoHub={undoHub}
			/>
		)
	}, [snap.project, snap.assets, appEvents, appCommands, undoHub])

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
			{canvas}

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

			<AlignmentControls
				orientation="horizontal"
				onAlignStart={() => appCommands.emit('align', 'left')}
				onAlignCenter={() => appCommands.emit('align', 'horizontal-center')}
				onAlignEnd={() => appCommands.emit('align', 'right')}
				onDistribute={() => appCommands.emit('align', 'distribute-horizontal')}
			/>

			<AlignmentControls
				orientation="vertical"
				onAlignStart={() => appCommands.emit('align', 'top')}
				onAlignCenter={() => appCommands.emit('align', 'vertical-center')}
				onAlignEnd={() => appCommands.emit('align', 'bottom')}
				onDistribute={() => appCommands.emit('align', 'distribute-vertical')}
			/>

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
