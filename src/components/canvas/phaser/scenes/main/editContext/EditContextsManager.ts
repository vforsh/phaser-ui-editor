import { Logger } from 'tslog'
import { EventfulContainer } from '../../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from '../MainScene'
import { EditContext, isSelectable } from './EditContext'

interface AddContextOptions {
	/**
	 * If true, the context will be switched to immediately after being added.
	 * @default false
	 */
	switchTo?: boolean
	/**
	 * If true, the context will automatically manage the selectables.
	 * @default true
	 */
	autoManageSelectables?: boolean
}

type EditContextsManagerEvents = {
	'context-switched': (context: EditContext) => void
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

	constructor(options: EditContextsManagerOptions) {
		super()

		this.options = options
		this.scene = options.scene
		this.logger = options.logger
		this.destroyController = new AbortController()
	}

	public add(container: EventfulContainer, options: AddContextOptions = {}) {
		if (this.contexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' already exists`)
		}

		const editContext = new EditContext({
			scene: this.scene,
			target: container,
			logger: this.logger.getSubLogger({ name: `:selection` }),
		})

		editContext.on('container-double-clicked', (container) => this.switchTo(container))

		editContext.once('pre-destroy', () => this.remove(container), this, this.scene.shutdownSignal)

		this.contexts.set(container, editContext)

		this.logger.debug(`added edit context for '${container.name}'`)

		const _options = Object.assign(
			{
				autoManageSelectables: true,
				switchTo: false,
			},
			options
		)

		if (_options.autoManageSelectables) {
			container.on(
				'child-added',
				(child: Phaser.GameObjects.GameObject) => {
					if (isSelectable(child)) {
						editContext.register(child)
					}
				},
				this,
				editContext.destroySignal
			)

			container.on(
				'child-removed',
				(child: Phaser.GameObjects.GameObject) => {
					if (isSelectable(child)) {
						editContext.unregister(child)
					}
				},
				this,
				editContext.destroySignal
			)

			container.list.forEach((child) => {
				if (isSelectable(child)) {
					editContext.register(child)
				}
			})
		}

		if (_options.switchTo) {
			this.switchTo(container)
		}

		return editContext
	}

	public remove(container: EventfulContainer) {
		if (!this.contexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}
		
		// TODO handle removal of active context

		container.removeByContext(this)

		this.logger.debug(`removed edit context for '${container.name}'`)

		this.contexts.delete(container)
	}

	public switchTo(container: EventfulContainer): EditContext {
		if (this.current?.target === container) {
			return this.current
		}

		const editContext = this.contexts.get(container)
		if (!editContext) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}

		this.current?.onExit()

		editContext.onEnter()

		this.logger.info(`switched to '${editContext.name}' edit context`)

		this.emit('context-switched', editContext)

		return editContext
	}

	public destroy(): void {
		super.destroy()

		this.destroyController.abort()
		this.contexts.forEach((context) => context.destroy())
		this.contexts.clear()
	}

	public get current(): EditContext | undefined {
		for (const context of this.contexts.values()) {
			if (context.active) {
				return context
			}
		}
	}

	public get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
