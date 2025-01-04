import { Logger } from 'tslog'
import { EventfulContainer } from '../../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from '../MainScene'
import { EditContext, shouldIgnoreObject } from './EditContext'

interface AddContextOptions {
	/**
	 * If true, the context will be switched to immediately after being added.
	 * @default false
	 */
	switchTo?: boolean
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

		const signal = this.destroySignal

		const editContext = new EditContext({
			scene: this.scene,
			target: container,
			logger: this.logger.getSubLogger({ name: `:selection` }),
		})

		editContext.on('container-added', (container) => this.add(container), this, signal)
		editContext.on('container-removed', (container) => this.remove(container), this, signal)
		editContext.on('container-double-clicked', (container) => this.switchTo(container), this, signal)
		editContext.once('pre-destroy', () => this.remove(container), this, signal)

		this.contexts.set(container, editContext)

		this.logger.debug(`added edit context for '${container.name}'`)

		const _options = Object.assign(
			{
				switchTo: false,
			} satisfies AddContextOptions,
			options
		)

		if (_options.switchTo) {
			this.switchTo(container)
		}

		// this.logger.debug(`contexts(${this.contexts.size}): ${this.getState()}`)

		return editContext
	}

	public remove(container: EventfulContainer) {
		const editContext = this.contexts.get(container)
		if (!editContext) {
			return
		}

		// TODO handle removal of active context

		container.removeByContext(this)
		
		editContext.onRemove()

		this.logger.debug(`removed edit context for '${container.name}'`)

		this.contexts.delete(container)

		// this.logger.debug(`contexts(${this.contexts.size}): ${this.getState()}`)
	}

	private getState(): string {
		return Array.from(this.contexts.values())
			.map((context) => {
				const childrenCount = context.target.list.reduce((acc, child) => {
					if (shouldIgnoreObject(child)) {
						return acc
					}
					return acc + 1
				}, 0)
				return `${context.name}(${childrenCount})`
			})
			.join(', ')
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
