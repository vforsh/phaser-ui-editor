import { logger } from '@logs/logs'
import { EventfulContainer } from '../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from './MainScene'
import { SelectionManager } from './selection/SelectionManager'

export type Events = {
	'pre-destroy': () => void
}

export interface EditContextOptions {
	scene: MainScene
	target: EventfulContainer
}

/**
 * Do not create instances of this class directly. Use {@link MainScene#addEditContext} instead.
 */
export class EditContext extends TypedEventEmitter<Events> {
	private options: EditContextOptions
	private scene: MainScene
	public readonly target: EventfulContainer
	public readonly selection: SelectionManager
	private destroyController: AbortController

	constructor(options: EditContextOptions) {
		super()

		this.options = options
		this.scene = options.scene

		this.target = options.target
		this.target.once('destroy', () => this.destroy())

		this.destroyController = new AbortController()

		this.selection = new SelectionManager({
			scene: this.scene,
			context: this.target,
			logger: logger.getOrCreate('canvas').getSubLogger({ name: ':selection' }),
		})
	}

	public destroy(): void {
		this.emit('pre-destroy')

		super.destroy()

		this.destroyController.abort()

		this.selection.destroy()
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
