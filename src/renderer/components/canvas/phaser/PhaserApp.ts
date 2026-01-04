import { logger } from '@logs/logs'

import './robowhale/phaser3/Phaser3Extensions'
import { mainApi } from '@main-api/main-api'
import { until } from '@open-draft/until'
import { state } from '@state/State'
import { urlParams } from '@url-params'
import { getErrorLog } from '@utils/error/utils'
import ResizeSensor from 'css-element-queries/src/ResizeSensor'
import { debounce } from 'es-toolkit'
import { ILogObj, Logger } from 'tslog'

import { AppCommands, AppCommandsEmitter } from '../../../AppCommands'
import { AppEvents, AppEventsEmitter } from '../../../AppEvents'
import { UndoHub } from '../../../history/UndoHub'
import { Project } from '../../../project/Project'
import { ProjectConfig } from '../../../project/ProjectConfig'
import { getAssetById, getAssetRelativePath, isAssetOfType } from '../../../types/assets'
import { PrefabFile } from '../../../types/prefabs/PrefabFile'
import { PrefabFile } from './../../../types/prefabs/PrefabFile'
import { PhaserAppCommands, PhaserAppCommandsEmitter } from './PhaserAppCommands'
import { PhaserAppEvents, PhaserAppEventsEmitter } from './PhaserAppEvents'
import { Phaser3Extensions } from './robowhale/phaser3/Phaser3Extensions'
import { BaseScene } from './robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './robowhale/utils/events/CommandEmitter'
import { MainScene } from './scenes/main/MainScene'
import { MainSceneInitData } from './scenes/main/mainScene/mainSceneTypes'
import { TestSceneInitData } from './scenes/test/TestScene'

export type Vector2Like = Phaser.Types.Math.Vector2Like

/**
 * Extra properties that are added to the Phaser.Game instance
 */
export interface PhaserGameExtra {
	/** to pass events from Phaser app to the parent React app */
	ev3nts: PhaserAppEventsEmitter

	/** to pass commands from Phaser app to the parent React app */
	commands: PhaserAppCommandsEmitter

	/** to receive events from the parent React app */
	appEvents: AppEventsEmitter

	/** to receive commands from the parent React app */
	appCommands: AppCommandsEmitter

	undoHub: UndoHub

	/** logger for the Phaser app */
	logger: Logger<ILogObj>

	destroySignal: AbortSignal
}

export interface PhaserAppCreateOptions {
	/** Configuration for the Phaser game instance */
	phaserConfig: Phaser.Types.Core.GameConfig

	/** Configuration for the project being edited */
	projectConfig: ProjectConfig

	/** To receive events from the parent React app */
	appEvents: TypedEventEmitter<AppEvents>

	/** To receive commands from the parent React app */
	appCommands: CommandEmitter<AppCommands>

	/** To manage undo/redo history */
	undoHub: UndoHub
}

export class PhaserApp extends Phaser.Game implements PhaserGameExtra {
	public logger: Logger<ILogObj>
	public projectConfig: ProjectConfig
	public ev3nts = new TypedEventEmitter<PhaserAppEvents>()
	public commands = new CommandEmitter<PhaserAppCommands>('phaser-app')
	public appEvents: AppEventsEmitter
	public appCommands: AppCommandsEmitter
	public undoHub: UndoHub
	private resizeSensor: ResizeSensor
	private destroyController = new AbortController()

	constructor(options: PhaserAppCreateOptions) {
		const { phaserConfig, projectConfig, appEvents, appCommands, undoHub } = options

		Phaser3Extensions.extend()

		super(phaserConfig)

		if (urlParams.get('clearConsole') === 'phaser') {
			console.clear()
		}

		this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), { signal: this.destroySignal })

		this.logger = logger.getOrCreate('canvas')
		this.logger.info('PhaserApp created')

		this.projectConfig = projectConfig

		this.appEvents = appEvents

		this.undoHub = undoHub

		this.appCommands = appCommands
		this.appCommands.on('open-prefab', this.openPrefab, this, false, this.destroySignal)
		this.appCommands.on('discard-unsaved-prefab', this.discardUnsavedPrefab, this, false, this.destroySignal)
		this.appCommands.on('undo', () => this.undoHub.undo(), this, false, this.destroySignal)
		this.appCommands.on('redo', () => this.undoHub.redo(), this, false, this.destroySignal)
		this.appCommands.on('get-canvas-metrics', this.getCanvasMetrics, this, false, this.destroySignal)

		this.resizeSensor = this.setupScaling()

		// TODO add Boot scene where we load editor assets
		this.scene.add('MainScene', MainScene)
		// this.scene.add('TestScene', TestScene)

		if (urlParams.getBool('test')) {
			this.scene.start('TestScene', {
				project: new Project({ config: projectConfig }),
			} satisfies TestSceneInitData)
		} else {
			if (state.canvas.lastOpenedPrefabAssetId) {
				this.openPrefab(state.canvas.lastOpenedPrefabAssetId)
			} else {
				// TODO start ChoosePrefabScene
			}
		}
	}

	private async openPrefab(prefabAssetId: string) {
		const prefabAsset = getAssetById(state.assets.items, prefabAssetId)
		if (!prefabAsset) {
			this.logger.error(`failed to open prefab: '${prefabAssetId}' not found`)
			return
		}

		if (!isAssetOfType(prefabAsset, 'prefab')) {
			this.logger.error(`failed to open prefab: '${prefabAssetId}' is not a prefab`)
			return
		}

		const mainScene = this.scene.getScene('MainScene') as MainScene
		if (mainScene && mainScene.scene.isActive() && mainScene.initData?.prefabAsset.id === prefabAssetId) {
			this.logger.info(`prefab '${prefabAsset.name}' (${prefabAsset.id}) is already opened`)
			return
		}

		if (mainScene && mainScene.scene.isActive() && state.canvas.hasUnsavedChanges) {
			// prefab that is currently opened
			const editedPrefabName = mainScene.initData.prefabAsset.name

			const shouldSave = confirm(`Save changes to '${editedPrefabName}'?`)
			if (shouldSave) {
				const saveResult = await mainScene.savePrefab()
				if (saveResult.isErr()) {
					return
				}
			}

			// TODO prefabs: use mantine modal instead of confirm

			/* const saveResult = await this.commands.emit('prompt-prefab-save', { prefabName })

			if (saveResult === 'cancel') {
				return
			}

			if (saveResult === 'dont-save') {
				// continue to open the new prefab without saving
			}

			if (saveResult === 'save') {
				const saveResult = await mainScene.savePrefab()
				if (saveResult.isErr()) {
					return
				}
			} */
		}

		const { error, data } = await until(() => mainApi.readJson({ path: prefabAsset.path }))
		if (error) {
			this.logger.error(`failed to load prefab from '${prefabAsset.path}' (${getErrorLog(error)})`)
			return
		}

		// TODO add zod validation and check if the loaded json is a valid prefab file
		const prefabFile = data as PrefabFile
		const prefabRelPath = getAssetRelativePath(prefabAsset.path)

		this.logger.info(`loaded prefab '${prefabAsset.name}' (assetId: ${prefabAsset.id}, path: ${prefabRelPath})`)
		this.scene.start('MainScene', {
			project: new Project({ config: this.projectConfig }),
			prefabAsset,
			prefabFile,
		} satisfies MainSceneInitData)

		// save the prefab asset id to the state so it will auto-open it next time
		state.canvas.lastOpenedPrefabAssetId = prefabAssetId
	}

	private async discardUnsavedPrefab() {
		console.log(`discardUnsavedPrefab`)
	}

	private getCanvasMetrics() {
		return {
			width: this.canvas.width,
			height: this.canvas.height,
			isConnected: this.canvas.isConnected,
			currentPrefabAssetId: state.canvas.lastOpenedPrefabAssetId,
		}
	}

	private setupScaling() {
		const onResizeDebounced = debounce(this.handleResize.bind(this), 100, {
			signal: this.destroySignal,
			edges: ['trailing'],
		})

		const resizeSensor = new ResizeSensor(this.canvas.parentElement!, (size) => onResizeDebounced(size))

		const width = this.canvas.parentElement!.clientWidth
		const height = this.canvas.parentElement!.clientHeight
		this.handleResize({ width, height })

		return resizeSensor
	}

	private handleResize(size: { width: number; height: number }) {
		this.scale.resize(size.width, size.height)
	}

	override destroy(removeCanvas: boolean, noReturn?: boolean): void {
		this.logger.info('PhaserApp destroy - start')

		super.destroy(removeCanvas, noReturn)

		this.scene.scenes.forEach((scene) => {
			if (scene instanceof BaseScene && scene.scene.isActive()) {
				scene.onShutdown()
			}
		})

		this.destroyController.abort()

		if (this.resizeSensor) {
			this.resizeSensor.detach()
		}

		this.logger.info('PhaserApp destroy - complete')
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
