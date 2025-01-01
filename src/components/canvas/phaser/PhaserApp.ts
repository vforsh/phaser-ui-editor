import { MainScene, MainSceneInitData } from './scenes/main/MainScene'

import './robowhale/phaser3/Phaser3Extensions'

import ResizeSensor from 'css-element-queries/src/ResizeSensor'
import { debounce } from 'es-toolkit'
import { AppCommands, AppCommandsEmitter } from '../../../AppCommands'
import { AppEvents, AppEventsEmitter } from '../../../AppEvents'
import { Project } from '../../../project/Project'
import { ProjectConfig } from '../../../project/ProjectConfig'
import { PhaserAppCommands, PhaserAppCommandsEmitter } from './PhaserAppCommands'
import { PhaserAppEvents, PhaserAppEventsEmitter } from './PhaserAppEvents'
import { Phaser3Extensions } from './robowhale/phaser3/Phaser3Extensions'
import { TypedEventEmitter } from './robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './robowhale/utils/events/CommandEmitter'
import { Logger } from 'tslog'
import { logger } from '@logs/logs'
import { BaseScene } from './robowhale/phaser3/scenes/BaseScene'

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

		this.logger = logger.getOrCreate('canvas')
		this.logger.info('PhaserApp created')

		this.appEvents = appEvents

		this.appCommands = appCommands

		this.resizeSensor = this.setupScaling()

		// TODO add Boot scene where we load editor assets
		this.scene.add('MainScene', MainScene)

		this.scene.start('MainScene', {
			project: new Project({ config: projectConfig }),
		} satisfies MainSceneInitData)
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
			if (scene instanceof BaseScene) {
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
