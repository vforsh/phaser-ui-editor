import './robowhale/phaser3/Phaser3Extensions'

import { logger } from '@logs/logs'
import { until } from '@open-draft/until'
import { state } from '@state/State'
import { urlParams } from '@url-params'
import { getErrorLog } from '@utils/error/utils'
import ResizeSensor from 'css-element-queries/src/ResizeSensor'
import { debounce } from 'es-toolkit'
import { Logger } from 'tslog'
import { AppCommands, AppCommandsEmitter } from '../../../AppCommands'
import { AppEvents, AppEventsEmitter } from '../../../AppEvents'
import { Project } from '../../../project/Project'
import { ProjectConfig } from '../../../project/ProjectConfig'
import trpc from '../../../trpc'
import { getAssetById, isAssetOfType } from '../../../types/assets'
import { PrefabFile } from '../../../types/prefabs/PrefabFile'
import { PhaserAppCommands, PhaserAppCommandsEmitter } from './PhaserAppCommands'
import { PhaserAppEvents, PhaserAppEventsEmitter } from './PhaserAppEvents'
import { Phaser3Extensions } from './robowhale/phaser3/Phaser3Extensions'
import { BaseScene } from './robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './robowhale/utils/events/CommandEmitter'
import { MainScene, MainSceneInitData } from './scenes/main/MainScene'
import { TestScene, TestSceneInitData } from './scenes/test/TestScene'

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

	/** logger for the Phaser app */
	logger: Logger<{}>

	destroySignal: AbortSignal
}

export class PhaserApp extends Phaser.Game implements PhaserGameExtra {
	public logger: Logger<{}>
	public projectConfig: ProjectConfig
	public ev3nts = new TypedEventEmitter<PhaserAppEvents>()
	public commands = new CommandEmitter<PhaserAppCommands>('phaser-app')
	public appEvents: AppEventsEmitter
	public appCommands: AppCommandsEmitter
	private resizeSensor: ResizeSensor
	private destroyController = new AbortController()

	constructor(
		phaserConfig: Phaser.Types.Core.GameConfig,
		projectConfig: ProjectConfig,
		appEvents: TypedEventEmitter<AppEvents>,
		appCommands: CommandEmitter<AppCommands>
	) {
		Phaser3Extensions.extend()

		super(phaserConfig)

		if (urlParams.get('clearConsole') === 'phaser') {
			console.clear()
		}

		this.canvas.addEventListener('pointerdown', (e) => this.canvas.focus(), { signal: this.destroySignal })

		this.logger = logger.getOrCreate('canvas')
		this.logger.info('PhaserApp created')

		this.projectConfig = projectConfig

		this.appEvents = appEvents

		this.appCommands = appCommands
		this.appCommands.on('open-prefab', this.openPrefab, this, false, this.destroySignal)

		this.resizeSensor = this.setupScaling()

		// TODO add Boot scene where we load editor assets
		this.scene.add('MainScene', MainScene)
		this.scene.add('TestScene', TestScene)
		// TODO add ChoosePrefabScene

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

		const { error, data } = await until(() => trpc.readJson.query({ path: prefabAsset.path }))
		if (error) {
			this.logger.error(`failed to load prefab from '${prefabAsset.path}' (${getErrorLog(error)})`)
			return
		}

		// TODO add zod validation and check if the loaded json is a valid prefab file
		const prefabFile = data as PrefabFile

		this.logger.info(`loaded prefab from '${prefabAsset.path}'`, prefabFile)

		this.scene.start('MainScene', {
			project: new Project({ config: this.projectConfig }),
			prefabAsset,
			prefabFile,
		} satisfies MainSceneInitData)

		// save the prefab asset id to the state so it will auto-open it next time
		state.canvas.lastOpenedPrefabAssetId = prefabAssetId
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
