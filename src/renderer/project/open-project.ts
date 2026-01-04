import { LogsManager } from '@logs/LogsManager'
import { logger as rootLogger } from '@logs/logs'
import JSON5 from 'json5'
import path from 'path-browserify-esm'
import { ILogObj, Logger } from 'tslog'
import { backend } from '../backend-renderer/backend'
import { buildAssetTree } from '../components/assetsPanel/build-asset-tree'
import { state, stateSchema } from '../state/State'
import { projectConfigSchema } from './ProjectConfig'

type AppLogger = LogsManager | Logger<ILogObj>

type OpenedProject = {
	projectConfig: ReturnType<typeof projectConfigSchema.parse>
	assetsDir: string
}

export async function openProjectByPath(projectDirPath: string, log?: AppLogger): Promise<boolean> {
	const logger = log ?? rootLogger

	if (path.isAbsolute(projectDirPath) === false) {
		logger.warn(`project path is not absolute: '${projectDirPath}'`)
		return false
	}

	const openedProject = await loadProject(projectDirPath, logger)
	if (!openedProject) {
		return false
	}

	logger.info('project opened', openedProject)

	const assetsGlob = path.join(openedProject.assetsDir, '**/*')
	const assetsToIgnore = openedProject.projectConfig.assetsIgnore.map((item) =>
		path.join(openedProject.assetsDir, item)
	)
	const assets = await backend.globby({
		patterns: [assetsGlob],
		options: { ignore: assetsToIgnore, markDirectories: true },
	})

	const assetTree = await buildAssetTree(assets, openedProject.assetsDir)
	state.assets.items = stateSchema.shape.assets.shape.items.parse(assetTree)

	state.lastOpenedProjectDir = projectDirPath

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

	if (typeof window !== 'undefined' && (window as any).controlIpc) {
		;(window as any).controlIpc.sendEditorStatus({ projectPath: projectDirPath })
	}

	return true
}

async function loadProject(projectDirPath: string, logger: AppLogger): Promise<OpenedProject | null> {
	const files = (
		await backend.globby({
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
		logger.warn(`${projectConfigFileName} is not found in '${projectDirPath}'`)
		return null
	}

	const projectConfigRaw = await backend.readText({ path: projectConfigPath })
	const projectConfigParsed = JSON5.parse(projectConfigRaw.content)
	const projectConfig = projectConfigSchema.parse(projectConfigParsed)

	const assetsDirPath = path.join(projectDirPath, projectConfig.assetsDir)
	const assetsDirStats = await backend.stat({ path: assetsDirPath })
	if (assetsDirStats.isDirectory === false) {
		logger.warn(`assets dir is not found at '${assetsDirPath}'`)
		return null
	}

	return {
		projectConfig,
		assetsDir: assetsDirPath,
	}
}
