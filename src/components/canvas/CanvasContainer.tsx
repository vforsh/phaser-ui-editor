import { Badge, Button, Center, Group, Loader, Overlay, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import { Cuboid } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAppCommands, useAppEvents, useUndoHub } from '../../di/DiContext'
import { State, state, useSnapshot } from '../../state/State'
import { getAssetsOfType, isDraggableAsset, type AssetTreeItemData } from '../../types/assets'
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
	const [overlayReady, setOverlayReady] = useState(false)
	const [showOpeningLastPrefab, setShowOpeningLastPrefab] = useState(false)

	const projectOpen = Boolean(snap.project)
	const prefabOpen = Boolean(snap.canvas.currentPrefab)
	const lastOpenedPrefabAssetId = snap.canvas.lastOpenedPrefabAssetId
	const prefabAssets = getAssetsOfType(snap.assets.items as State['assets']['items'], 'prefab')
	const hasAnyPrefabs = prefabAssets.length > 0
	const prefabAssetIds = new Set(prefabAssets.map((prefab) => prefab.id))
	const recentPrefabs = snap.canvas.recentPrefabs.filter((prefab) => prefabAssetIds.has(prefab.assetId))

	useEffect(() => {
		if (projectOpen && !prefabOpen) {
			setOverlayReady(false)
			const timer = window.setTimeout(() => setOverlayReady(true), 200)
			return () => window.clearTimeout(timer)
		}
		setOverlayReady(false)
		return undefined
	}, [projectOpen, prefabOpen])

	useEffect(() => {
		if (projectOpen && !prefabOpen && lastOpenedPrefabAssetId) {
			setShowOpeningLastPrefab(true)
			const timer = window.setTimeout(() => setShowOpeningLastPrefab(false), 1500)
			return () => window.clearTimeout(timer)
		}
		setShowOpeningLastPrefab(false)
		return undefined
	}, [projectOpen, prefabOpen, lastOpenedPrefabAssetId, snap.projectDir])

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

	// Important: don't memoize the <Canvas /> element. Fast Refresh / HMR can swap the component implementation,
	// and keeping a stale React element object here can leave refs pointing at detached DOM nodes.
	const canvas =
		snap.project && snap.projectDir && snap.assets ? (
			<Canvas
				projectDir={snap.projectDir}
				projectConfig={snap.project}
				appEvents={appEvents}
				appCommands={appCommands}
				undoHub={undoHub}
			/>
		) : null

	return (
		<div
			data-testid="canvas"
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

			{projectOpen && !prefabOpen && (showOpeningLastPrefab || overlayReady) && (
				<Overlay
					opacity={0.6}
					color="#0b0b0b"
					zIndex={10}
					style={{ pointerEvents: 'auto' }}
					onClick={() => snap.assets.focusPanel?.()}
				>
					<Center h="100%">
						<Paper radius="md" p="lg" shadow="md" withBorder>
							<Stack gap="md" align="center">
								<ThemeIcon size={44} radius="xl" variant="light">
									<Cuboid size={24} />
								</ThemeIcon>

								{showOpeningLastPrefab ? (
									<Stack gap={6} align="center">
										<Text fw={600} size="lg">
											Opening last prefab...
										</Text>
										<Text c="dimmed" ta="center">
											Loading the last opened prefab for this project.
										</Text>
										<Loader size="sm" />
									</Stack>
								) : !hasAnyPrefabs ? (
									<Stack gap={6} align="center">
										<Text fw={600} size="lg">
											No prefabs found
										</Text>
										<Text c="dimmed" ta="center">
											Create one in Assets / Create / Prefab.
										</Text>
										<Group gap="xs">
											<Badge variant="light">Tip</Badge>
											<Text size="sm" c="dimmed">
												Right-click in Assets / Create / Prefab
											</Text>
										</Group>
									</Stack>
								) : (
									<Stack gap="md" align="center">
										<Stack gap={6} align="center">
											<Text fw={600} size="lg">
												No prefab opened
											</Text>
											<Text c="dimmed" ta="center">
												Open a prefab from the Assets panel by double-clicking a{' '}
												<Text span fw={600}>
													Prefab
												</Text>
												.
											</Text>
											<Group gap="xs">
												<Badge variant="light">Tip</Badge>
												<Text size="sm" c="dimmed">
													Double-click a Prefab asset in Assets
												</Text>
											</Group>
										</Stack>

										{recentPrefabs.length > 0 && (
											<Stack gap="xs" align="center">
												<Text size="sm" c="dimmed">
													Recent prefabs
												</Text>
												<Group gap="xs">
													{recentPrefabs.slice(0, 5).map((prefab) => (
														<Button
															key={prefab.assetId}
															variant="light"
															size="xs"
															onClick={() =>
																appCommands.emit('open-prefab', prefab.assetId)
															}
														>
															{prefab.name}
														</Button>
													))}
												</Group>
											</Stack>
										)}
									</Stack>
								)}
							</Stack>
						</Paper>
					</Center>
				</Overlay>
			)}
		</div>
	)
}
