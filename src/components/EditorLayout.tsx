import { Box, Group, Paper, Stack, useMantineTheme } from '@mantine/core'
import { useCallback, useState } from 'react'
import type { FileItem } from '../types/files'
import AssetsPanel from './AssetsPanel'
import Canvas from './canvas/Canvas'
import HierarchyPanel from './HierarchyPanel'
import InspectorPanel from './InspectorPanel'
import ResizableDivider from './ResizableDivider'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 400
const MIN_PANEL_HEIGHT = 300
const MAX_PANEL_HEIGHT = 800
const DEFAULT_PANEL_HEIGHT = 450

export default function EditorLayout() {
	const theme = useMantineTheme()
	const [leftPanelWidth, setLeftPanelWidth] = useState(250)
	const [rightPanelWidth, setRightPanelWidth] = useState(300)
	const [hierarchyHeight, setHierarchyHeight] = useState(Math.round(window.innerHeight / 2) - 6)
	const [selectedAsset, setSelectedAsset] = useState<FileItem | null>(null)

	const handleLeftResize = useCallback((delta: number) => {
		setLeftPanelWidth((prev) => {
			const newWidth = prev + delta
			return Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
		})
	}, [])

	const handleRightResize = useCallback((delta: number) => {
		setRightPanelWidth((prev) => {
			const newWidth = prev - delta
			return Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
		})
	}, [])

	const handleHierarchyResize = useCallback((delta: number) => {
		setHierarchyHeight((prev) => {
			const newHeight = prev + delta
			return Math.min(Math.max(newHeight, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT)
		})
	}, [])

	return (
		<Group align="stretch" style={{ height: '100vh', margin: 0, backgroundColor: 'black' }} spacing={0} gap={0}>
			{/* Left Column */}
			<Stack
				id="left-column"
				style={{
					width: leftPanelWidth,
					transition: 'width 0.05s ease-out',
					padding: '4px 0px 4px 4px',
					height: '100vh',
				}}
				gap="4px"
			>
				{/* Hierarchy Panel */}
				<Box
					style={{
						height: hierarchyHeight,
						minHeight: MIN_PANEL_HEIGHT,
						maxHeight: MAX_PANEL_HEIGHT,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<HierarchyPanel />
				</Box>

				{/* Horizontal Divider */}
				<ResizableDivider onResize={handleHierarchyResize} />

				{/* Assets Panel */}
				<Box
					style={{
						flex: 1,
						minHeight: MIN_PANEL_HEIGHT,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<AssetsPanel onSelectAsset={setSelectedAsset} />
				</Box>
			</Stack>

			{/* Left Divider */}
			<ResizableDivider onResize={handleLeftResize} vertical />

			{/* Middle Column - Canvas */}
			<Paper
				radius="sm"
				style={{
					padding: '4px 0px',
					flex: 1,
					backgroundColor: 'inherit',
					position: 'relative',
				}}
			>
				<Canvas />
			</Paper>

			{/* Right Divider */}
			<ResizableDivider onResize={handleRightResize} vertical />

			{/* Right Column - Inspector */}
			<Paper
				style={{
					width: rightPanelWidth,
					backgroundColor: 'inherit',
					transition: 'width 0.05s ease-out',
					padding: '4px 4px 4px 0px',
				}}
			>
				<Box
					radius="sm"
					style={{
						backgroundColor: '#242424',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<InspectorPanel selectedAsset={selectedAsset} />
				</Box>
			</Paper>
		</Group>
	)
}
