import { logs } from '@logs/logs'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from './MainScene'
import { SelectionManager } from './selection/SelectionManager'

export type Events = {
	'pre-destroy': () => void
}

export interface EditContextOptions {
	scene: MainScene
	target: Phaser.GameObjects.Container
}

export class EditContext extends TypedEventEmitter<Events> {
	private options: EditContextOptions
	private scene: MainScene
	public readonly _target: Phaser.GameObjects.Container
	private selection: SelectionManager
	private destroyController: AbortController
	
	constructor(options: EditContextOptions) {
		super()
		
		this.options = options
		this.scene = options.scene
		
		this._target = options.target
		this._target.once('destroy', () => this.destroy())
		
		this.destroyController = new AbortController()
		
		this.selection = new SelectionManager({
			scene: this.scene,
			logger: logs.getOrCreate('canvas').getSubLogger({ name: ':selection' }),
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

	public get target(): Phaser.GameObjects.Container {
		return this._target
	}
}
