import { Box, Group, Paper, Stack } from '@mantine/core'
import JSON5 from 'json5'
import path from 'path-browserify'
import { useCallback, useEffect, useState } from 'react'
import { projectConfigSchema } from '../data/project/ProjectConfig'
import trpc from '../trpc'
import type { FileItem } from '../types/files'
import AssetsPanel from './AssetsPanel'
import Canvas from './Canvas/Canvas'
import HierarchyPanel from './HierarchyPanel'
import InspectorPanel from './InspectorPanel'
import ResizableDivider from './ResizableDivider'
import { state } from '../state/State'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 400
const MIN_PANEL_HEIGHT = 300
const MAX_PANEL_HEIGHT = 800

export default function EditorLayout() {
	// const theme = useMantineTheme()
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

	useEffect(() => {
		const onKeyDown = async (event: KeyboardEvent) => {
			if (event.key === 'p' || event.key === 'P') {
				// TODO remove prompt default value later
				const projectDirPath = prompt('Enter project directory path', '/Users/vlad/dev/papa-cherry-2')
				if (!projectDirPath) {
					return
				}

				openProject(projectDirPath)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	// open project from query param or from saved state
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
			openProject(lastOpenedProjectDir)
			return
		}
	}, [])

	const openProject = async (projectDirPath: string) => {
		if (path.isAbsolute(projectDirPath) === false) {
			// TODO show mantine toast
			return
		}

		let openedProject = await doOpenProject(projectDirPath)
		if (!openedProject) {
			return
		}

		console.log('project', openedProject)

		const assetsGlob = path.join(openedProject.assetsDir, '**/*')
		const assetsToIgnore = openedProject.projectConfig.assetsIgnore.map((item) => path.join(openedProject.assetsDir, item))
		const assets = await trpc.globby.query({
			patterns: [assetsGlob],
			options: { ignore: assetsToIgnore },
		})

		console.log('assets', assets)

		// TODO refactor into separate function
		// const fileTreeData = await buildFileTree(assets, openedProject.assetsDir)
		// const assetsTreeData = await buildAssetsTree(fileTreeData)
		// setAssetTreeData(assetsTreeData)

		// TODO init Project instance

		// setProject(openedProject.projectConfig)

		// state.lastOpenedProjectDir = projectDirPath

		// update recent projects
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
	}

	// TODO return Result (true-myth)
	const doOpenProject = async (projectDirPath: string) => {
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
			console.log(`${projectConfigFileName} is not found in the ${projectDirPath}`)
			return null
		}

		const projectConfigRaw = await trpc.readText.query({ path: projectConfigPath })
		const projectConfigParsed = JSON5.parse(projectConfigRaw.content)
		const projectConfig = projectConfigSchema.parse(projectConfigParsed)

		const assetsDirPath = path.join(projectDirPath, projectConfig.assetsDir)
		const assetsDirStats = await trpc.stat.query({ path: assetsDirPath })
		if (assetsDirStats.isDirectory === false) {
			console.log(`assetsDir ${assetsDirPath} not found`)
			return null
		}

		return {
			projectDir: projectDirPath,
			projectConfig,
			assetsDir: assetsDirPath,
		}
	}

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
