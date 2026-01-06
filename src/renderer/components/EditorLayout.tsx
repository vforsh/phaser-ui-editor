import { logger } from '@logs/logs'
import { Box, Group, Paper, Stack } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'

import { useUndoHub } from '../di/DiHooks'
import { useGlobalUndoRedoShortcuts } from '../hooks/useGlobalUndoRedoShortcuts'
import { openProjectByPath } from '../project/open-project'
import { state, useSnapshot } from '../state/State'
import { UrlParams } from '../url-params/UrlParams'
import AssetsPanel from './assetsPanel/AssetsPanel'
import CanvasContainer from './canvas/CanvasContainer'
import OpenProjectDialog from './dialogs/OpenProjectDialog'
import HierarchyPanel from './hierarchyPanel/HierarchyPanel'
import InspectorPanel from './inspector/InspectorPanel'
import ResizableDivider from './ResizableDivider'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 420
const MIN_PANEL_HEIGHT = 300
const MAX_PANEL_HEIGHT = 800

export default function EditorLayout() {
	const undoHub = useUndoHub()
	const snap = useSnapshot(state)

	const { leftPanelWidth: lpw, rightPanelWidth: rpw, hierarchyHeight: hh } = state.panelDimensions
	const [leftPanelWidth, setLeftPanelWidth] = useState(lpw)
	const [rightPanelWidth, setRightPanelWidth] = useState(rpw)
	const [hierarchyHeight, setHierarchyHeight] = useState(hh || Math.round(window.innerHeight / 2) - 6)
	const [openProjectDialogOpen, setOpenProjectDialogOpen] = useState(false)

	const handleLeftResize = useCallback((delta: number) => {
		setLeftPanelWidth((prev) => {
			const newWidth = Math.min(Math.max(prev + delta, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
			state.panelDimensions.leftPanelWidth = newWidth
			return newWidth
		})
	}, [])

	const handleRightResize = useCallback((delta: number) => {
		setRightPanelWidth((prev) => {
			const newWidth = Math.min(Math.max(prev - delta, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
			state.panelDimensions.rightPanelWidth = newWidth
			return newWidth
		})
	}, [])

	const handleHierarchyResize = useCallback((delta: number) => {
		setHierarchyHeight((prev) => {
			const newHeight = Math.min(Math.max(prev + delta, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT)
			state.panelDimensions.hierarchyHeight = newHeight
			return newHeight
		})
	}, [])

	// open project dialog
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const activeElement = document.activeElement
			const isInputFocused =
				activeElement instanceof HTMLElement &&
				(activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)

			if (isInputFocused) {
				return
			}

			if (event.key === 'p' || event.key === 'P') {
				setOpenProjectDialogOpen(true)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	useGlobalUndoRedoShortcuts({ undoHub })

	// open last opened project if present
	useEffect(() => {
		const startProjectPath = UrlParams.get('projectPath')
		if (startProjectPath) {
			// TODO handle loading state
			openProject(startProjectPath)
			return
		}

		const lastOpenedProjectDir = state.lastOpenedProjectDir
		if (lastOpenedProjectDir) {
			// TODO handle loading state
			openProject(lastOpenedProjectDir)
			return
		}
	}, [])

	// display OpenProjectDialog if state.project is null
	useEffect(() => {
		if (snap.project || UrlParams.getBool('e2e')) {
			return
		}

		const startProjectPath = UrlParams.get('projectPath')
		if (startProjectPath) {
			return
		}

		if (state.lastOpenedProjectDir) {
			return
		}

		setOpenProjectDialogOpen(true)
	}, [snap.project])

	// close OpenProjectDialog once a project is opened (incl. control-rpc openProject)
	const isProjectOpen = !!snap.project
	useEffect(() => {
		if (isProjectOpen) {
			setOpenProjectDialogOpen(false)
		}
	}, [isProjectOpen])

	const openProject = async (projectDirPath: string) => {
		await openProjectByPath(projectDirPath, logger)
	}

	const displayHierarchyPanel = snap.layout.showHierarchyPanel
	const displayAssetsPanel = snap.layout.showAssetsPanel
	const displayLeftPanel = displayHierarchyPanel || displayAssetsPanel
	const displayInspectorPanel = snap.layout.showInspectorPanel
	const displayRightPanel = displayInspectorPanel

	return (
		<>
			<Group align="stretch" style={{ height: '100vh', margin: 0, backgroundColor: 'black' }} gap={0}>
				{/* Left Column */}
				{displayLeftPanel && (
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
						{displayHierarchyPanel && (
							<Box
								style={{
									height: hierarchyHeight,
									minHeight: MIN_PANEL_HEIGHT,
									maxHeight: MAX_PANEL_HEIGHT,
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								<HierarchyPanel logger={logger.getOrCreate('hierarchy')} />
							</Box>
						)}

						{/* Horizontal Divider */}
						{(displayHierarchyPanel || displayAssetsPanel) && <ResizableDivider onResize={handleHierarchyResize} />}

						{/* Assets Panel */}
						{displayAssetsPanel && (
							<Box
								style={{
									flex: 1,
									minHeight: MIN_PANEL_HEIGHT,
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								<AssetsPanel logger={logger.getOrCreate('assets')} />
							</Box>
						)}
					</Stack>
				)}

				{/* Left Divider */}
				{displayLeftPanel && <ResizableDivider onResize={handleLeftResize} vertical />}

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
					<CanvasContainer />
				</Paper>

				{/* Right Divider */}
				{displayRightPanel && <ResizableDivider onResize={handleRightResize} vertical />}

				{/* Right Column - Inspector */}
				<Paper
					style={{
						width: rightPanelWidth,
						backgroundColor: 'inherit',
						transition: 'width 0.05s ease-out',
						padding: '4px 4px 4px 0px',
						display: displayRightPanel ? 'block' : 'none',
						height: '100vh',
					}}
				>
					<Box
						style={{
							backgroundColor: '#242424',
							height: '100%',
							display: 'flex',
							flexDirection: 'column',
							borderRadius: 'var(--mantine-radius-sm)',
						}}
					>
						<Box data-testid="inspector-panel" style={{ height: '100%', minHeight: 0 }}>
							<InspectorPanel logger={logger.getOrCreate('inspector')} />
						</Box>
					</Box>
				</Paper>
			</Group>

			<OpenProjectDialog //
				opened={openProjectDialogOpen}
				onClose={() => setOpenProjectDialogOpen(false)}
				onOpenProject={openProject}
			/>
		</>
	)
}
