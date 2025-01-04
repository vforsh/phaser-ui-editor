import { Logger } from 'tslog'
import { EventfulContainer } from '../../../robowhale/phaser3/gameObjects/container/EventfulContainer'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from '../MainScene'
import { EditContext } from './EditContext'

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
	private savedBounds: Map<EditContext, Phaser.Geom.Rectangle> = new Map()

	constructor(options: EditContextsManagerOptions) {
		super()

		this.options = options
		this.scene = options.scene
		this.logger = options.logger
		this.destroyController = new AbortController()
	}

	public add(container: EventfulContainer, options: AddContextOptions = {}): EditContext {
		if (this.contexts.has(container)) {
			throw new Error(`Edit context for '${container.name}' already exists`)
		}

		const signal = this.destroySignal

		const context = new EditContext({
			scene: this.scene,
			target: container,
			logger: this.logger.getSubLogger({ name: `:${container.name}` }),
		})

		context.on('container-added', (container) => this.add(container), this, signal)
		context.on('container-removed', (container) => this.remove(container), this, signal)
		context.on('container-double-clicked', (container) => this.switchTo(container), this, signal)
		context.on('bounds-changed', (bounds) => this.onContextBoundsChanged(context, bounds), this, signal)
		context.once('pre-destroy', () => this.remove(container), this, signal)

		context.onAdd()

		this.contexts.set(container, context)

		this.logger.debug(`added context '${container.name}'`)

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

		return context
	}

	public remove(container: EventfulContainer) {
		const editContext = this.contexts.get(container)
		if (!editContext) {
			return
		}

		// TODO handle removal of active context

		container.removeByContext(this)

		editContext.onRemove()
		
		this.logger.debug(`removed context '${container.name}'`)

		this.contexts.delete(container)

		// this.logger.debug(`contexts(${this.contexts.size}): ${this.getState()}`)
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

		this.savedBounds = this.getParentContextsBounds(editContext)

		editContext.onEnter()

		this.logger.info(`switched to '${editContext.name}' edit context`)

		this.emit('context-switched', editContext)

		return editContext
	}

	private getParentContextsBounds(context: EditContext): Map<EditContext, Phaser.Geom.Rectangle> {
		let boundsMap = new Map<EditContext, Phaser.Geom.Rectangle>()

		let parent = context.target.parentContainer
		while (parent && this.contexts.has(parent)) {
			const parentContext = this.contexts.get(parent)
			if (!parentContext) {
				break
			}
			boundsMap.set(parentContext, parentContext.getBounds())
			parent = parent.parentContainer
		}

		return boundsMap
	}

	private onContextBoundsChanged(context: EditContext, bounds: Phaser.Geom.Rectangle) {
		// propagate bounds change to parent context
		const parentContext = this.contexts.get(context.target.parentContainer)
		if (parentContext) {
			const savedBounds = this.savedBounds.get(parentContext)
			if (savedBounds) {
				parentContext.updateBounds(savedBounds)
			}
		}
	}

	public destroy(): void {
		super.destroy()

		this.destroyController.abort()

		this.contexts.forEach((context) => context.destroy())
		this.contexts.clear()

		this.savedBounds.clear()
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
