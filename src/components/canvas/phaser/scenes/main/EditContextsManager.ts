import { Logger } from 'tslog'
import { EventfulContainer } from '../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { EditContext } from './EditContext'
import { MainScene } from './MainScene'
import { isSelectable } from './selection/SelectionManager'

interface AddContextOptions {
    /**
     * If true, the context will be switched to immediately after being added.
     * @default false
     */
	switchTo?: boolean
    /**
     * If true, the selection manager will automatically manage the selectables.
     * @default true
     */
	autoManageSelectables?: boolean
}

type EditContextsManagerEvents = {
	'switch-to': (context: EditContext) => void
}

export interface EditContextsManagerOptions {
	scene: MainScene
	logger: Logger<{}>
}

export class EditContextsManager extends TypedEventEmitter<EditContextsManagerEvents> {
	private options: EditContextsManagerOptions
	private scene: MainScene
	private logger: Logger<{}>
	private destroyController: AbortController
	private contexts: Map<EventfulContainer, EditContext> = new Map()
	private _current: EditContext | undefined

	constructor(options: EditContextsManagerOptions) {
		super()

		this.options = options
		this.scene = options.scene
		this.logger = options.logger
		this.destroyController = new AbortController()
	}

	public add(container: Phaser.GameObjects.Container, options: AddContextOptions = {}) {
		if (this.contexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' already exists`)
		}
		
		const editContext = new EditContext({
			scene: this.scene,
			target: container,
		})
		
		editContext.once('pre-destroy', () => this.remove(container), this, this.scene.shutdownSignal)
		
		this.contexts.set(container, editContext)
		
		this.logger.debug(`added edit context for '${container.name}'`)
		
		const _options = Object.assign({
			autoManageSelectables: true,
            switchTo: false,
		}, options)

		if (_options.autoManageSelectables) {
			container.on(
				'child-added',
				(child: Phaser.GameObjects.GameObject) => {
					if (isSelectable(child)) {
						editContext.selection.addSelectable(child)
					}
				},
				this,
				editContext.destroySignal
			)

			container.on(
				'child-removed',
				(child: Phaser.GameObjects.GameObject) => {
					if (isSelectable(child)) {
						editContext.selection.removeSelectable(child)
					}
				},
				this,
				editContext.destroySignal
			)

			container.list.forEach((child) => {
				if (isSelectable(child)) {
					editContext.selection.addSelectable(child)
				}
			})
		}

		if (_options.switchTo) {
			this.switchTo(container)
		}

		return editContext
	}

	public remove(container: Phaser.GameObjects.Container) {
		if (!this.contexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}

		this.logger.debug(`removed edit context for '${container.name}'`)

		this.contexts.delete(container)
	}

	public switchTo(container: Phaser.GameObjects.Container): EditContext {
		if (this.current?.target === container) {
			return this.current
		}

		const editContext = this.contexts.get(container)
		if (!editContext) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}

		this._current = editContext

		this.logger.info(`switched to '${container.name}' edit context`)

		this.emit('switch-to', editContext)

		return editContext
	}

	public destroy(): void {
		this.destroyController.abort()
		this.contexts.forEach((context) => context.destroy())
		this.contexts.clear()
		this._current = undefined
	}

	public get current(): EditContext | undefined {
		return this._current
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
