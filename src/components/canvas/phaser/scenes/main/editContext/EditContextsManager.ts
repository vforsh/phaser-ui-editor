import { ILogObj, Logger } from 'tslog'
import { TypedEventEmitter } from '../../../robowhale/phaser3/TypedEventEmitter'
import { MainScene } from '../MainScene'
import { EditableContainer } from '../objects/EditableContainer'
import { EditableObject } from '../objects/EditableObject'
import { EditContext } from './EditContext'
import { Selection } from './Selection'
interface AddContextOptions {
	/**
	 * If true, the context will be switched to immediately after being added.
	 * @default false
	 */
	switchTo?: boolean

	/**
	 * There can be only one root context.
	 * @default false
	 */
	isRoot?: boolean
}

type EditContextsManagerEvents = {
	'context-switched': (context: EditContext) => void
	'selection-changed': (selection: Selection | null) => void
}

export interface EditContextsManagerOptions {
	scene: MainScene
	logger: Logger<ILogObj>
}

export class EditContextsManager extends TypedEventEmitter<EditContextsManagerEvents> {
	private options: EditContextsManagerOptions
	private scene: MainScene
	private logger: Logger<ILogObj>
	private destroyController: AbortController
	private contexts: Map<Phaser.GameObjects.Container, EditContext> = new Map()

	constructor(options: EditContextsManagerOptions) {
		super()

		this.options = options
		this.scene = options.scene
		this.logger = options.logger
		this.destroyController = new AbortController()
	}

	public add(container: EditableContainer, options: AddContextOptions = {}): EditContext {
		if (this.contexts.has(container)) {
			return this.contexts.get(container)!
		}

		const signal = this.destroySignal

		const _options = Object.assign(
			{
				switchTo: false,
				isRoot: false,
			} satisfies AddContextOptions,
			options
		)

		const context = new EditContext({
			scene: this.scene,
			target: container,
			logger: this.logger.getSubLogger({ name: `:${container.name}` }),
			isRoot: _options.isRoot,
		})

		context.on('container-added', (container) => this.add(container), this, signal)
		// context.on('container-removed', (container) => this.remove(container), this, signal)
		context.on('container-double-clicked', (container) => this.switchTo(container), this, signal)
		context.on('selection-changed', (selection) => this.emit('selection-changed', selection), this, signal)
		context.once('pre-destroy', () => this.remove(container), this, signal)

		context.onAdd()

		this.contexts.set(container, context)

		this.logger.debug(`added ${_options.isRoot ? 'ROOT' : ''} context '${container.name}'`)

		if (_options.switchTo) {
			this.switchTo(container)
		}

		return context
	}

	public remove(container: EditableContainer) {
		const editContext = this.contexts.get(container)
		if (!editContext) {
			return
		}

		// TODO handle removal of active context

		container.removeByContext(this)

		editContext.onRemove()

		this.logger.debug(`removed context '${container.name}'`)

		this.contexts.delete(container)
	}

	public switchTo(container: EditableContainer): EditContext {
		if (this.current?.target === container) {
			return this.current
		}

		const editContext = this.contexts.get(container)
		if (!editContext) {
			throw new Error(`Edit context for '${container.name}' does not exist`)
		}

		const exitedContextName = this.current?.name

		this.current?.onExit()

		if (exitedContextName) {
			this.logger.info(`exited '${exitedContextName}' context`)
		}

		editContext.onEnter()

		this.logger.info(`entered '${editContext.name}' context`)

		this.emit('context-switched', editContext)

		return editContext
	}

	/**
	 * Finds the edit context that contains the given object.
	 * @returns the edit context that contains the object, or undefined if no context is found
	 */
	public findParentContext(obj: EditableObject): EditContext | undefined {
		return this.contexts.get(obj.parentContainer)
	}

	public getContext(target: EditableContainer): EditContext | undefined {
		return this.contexts.get(target)
	}

	public update(deltaMs: number): void {
		this.contexts.forEach((context) => context.active && context.update(deltaMs))
	}

	public destroy(): void {
		super.destroy()

		this.destroyController.abort()

		this.contexts.forEach((context) => context.destroy())
		this.contexts.clear()
	}

	public reset(): void {
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
