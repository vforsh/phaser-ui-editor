import { logger } from '@logs/logs'
import { Box, Group, Paper, Stack, useMantineTheme } from '@mantine/core'
import { urlParams } from '@url-params'
import JSON5 from 'json5'
import path from 'path-browserify-esm'
import { useCallback, useEffect, useState } from 'react'
import { projectConfigSchema } from '../project/ProjectConfig'
import { state, stateSchema } from '../state/State'
import trpc from '../trpc'
import AssetsPanel from './assetsPanel/AssetsPanel'
import { buildAssetTree } from './assetsPanel/build-asset-tree'
import CanvasContainer from './canvas/CanvasContainer'
import OpenProjectDialog from './dialogs/OpenProjectDialog'
import HierarchyPanel from './hierarchyPanel/HierarchyPanel'
import InspectorPanel from './inspector/InspectorPanel'
import ResizableDivider from './ResizableDivider'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 400
const MIN_PANEL_HEIGHT = 300
const MAX_PANEL_HEIGHT = 800

export default function EditorLayout() {
	const theme = useMantineTheme()

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
				(activeElement.tagName === 'INPUT' ||
					activeElement.tagName === 'TEXTAREA' ||
					activeElement.isContentEditable)

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

	// open project from query param or from saved state if present
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search)
		const projectDirPath = urlParams.get('projectDir')
		if (projectDirPath) {
			openProject(projectDirPath)
			return
		}

		// open last opened project
		const lastOpenedProjectDir = state.lastOpenedProjectDir
		if (lastOpenedProjectDir) {
			// TODO handle loading state
			openProject(lastOpenedProjectDir)
			return
		}
	}, [])

	// display OpenProjectDialog if state.project is null
	useEffect(() => {
		if (state.project) {
			return
		}

		setOpenProjectDialogOpen(true)
	}, [state.project])

	const openProject = async (projectDirPath: string) => {
		if (path.isAbsolute(projectDirPath) === false) {
			// TODO show mantine toast
			return
		}

		const openedProject = await doOpenProject(projectDirPath)
		if (!openedProject) {
			return
		}

		logger.info('project opened', openedProject)

		const assetsGlob = path.join(openedProject.assetsDir, '**/*')
		const assetsToIgnore = openedProject.projectConfig.assetsIgnore.map((item) =>
			path.join(openedProject.assetsDir, item)
		)
		const assets = await trpc.globby.query({
			patterns: [assetsGlob],
			options: { ignore: assetsToIgnore },
		})
		// console.log('assets paths', assets)

		const assetTree = await buildAssetTree(assets, openedProject.assetsDir)
		// console.log('assetTree', assetTree)
		state.assets.items = stateSchema.shape.assets.shape.items.parse(assetTree)

		state.lastOpenedProjectDir = projectDirPath

		// update recent projects in state
		state.recentProjects ??= []
		const recentProject = state.recentProjects.find((item) => item.dir === projectDirPath)
		if (recentProject) {
			recentProject.lastOpenedAt = Date.now()
		} else {
			state.recentProjects.push({
				name: openedProject.projectConfig.name,
				dir: projectDirPath,
				lastOpenedAt: Date.now(),
			})
		}

		state.project = openedProject.projectConfig
		state.projectDir = projectDirPath
	}

	// TODO return Result (neverthrow)
	const doOpenProject = async (projectDirPath: string) => {
		// return mockOpenedProject

		const files = (
			await trpc.globby.query({
				patterns: ['**/*'],
				options: {
					cwd: projectDirPath,
					gitignore: true,
				},
			})
		).map((item) => path.join(projectDirPath, item))

		const projectConfigFileName = 'project.json5'
		const projectConfigPath = files.find((item) => item.endsWith(projectConfigFileName))
		if (!projectConfigPath) {
			// TODO show mantine warning toast
			console.log(`${projectConfigFileName} is not found in the ${projectDirPath}`)
			return null
		}

		const projectConfigRaw = await trpc.readText.query({ path: projectConfigPath })
		const projectConfigParsed = JSON5.parse(projectConfigRaw.content)
		const projectConfig = projectConfigSchema.parse(projectConfigParsed)

		const assetsDirPath = path.join(projectDirPath, projectConfig.assetsDir)
		const assetsDirStats = await trpc.stat.query({ path: assetsDirPath })
		if (assetsDirStats.isDirectory === false) {
			// TODO show mantine warning toast
			console.log(`assetsDir ${assetsDirPath} not found`)
			return null
		}

		return {
			projectDir: projectDirPath,
			projectConfig,
			assetsDir: assetsDirPath,
		}
	}

	const hideHierarchyPanel = urlParams.getBool('hierarchy', '0')
	const hideAssetsPanel = urlParams.getBool('assets', '0')
	const hideInspectorPanel = urlParams.getBool('inspector', '0')

	const displayHierarchyPanel = !hideHierarchyPanel
	const displayAssetsPanel = !hideAssetsPanel
	const displayLeftPanel = displayHierarchyPanel || displayAssetsPanel
	const displayInspectorPanel = !hideInspectorPanel
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
						{(displayHierarchyPanel || displayAssetsPanel) && (
							<ResizableDivider onResize={handleHierarchyResize} />
						)}

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
						<InspectorPanel logger={logger.getOrCreate('inspector')} />
					</Box>
				</Paper>
			</Group>

			<OpenProjectDialog
				opened={openProjectDialogOpen}
				onClose={() => setOpenProjectDialogOpen(false)}
				onOpenProject={openProject}
			/>
		</>
	)
}
