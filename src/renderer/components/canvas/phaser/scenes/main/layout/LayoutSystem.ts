import type { ILogObj, Logger } from 'tslog'

import type { MainScene } from '../MainScene'
import type { EditableObject } from '../objects/EditableObject'
import type { EditableObjectsFactory } from '../objects/EditableObjectsFactory'

import { LayoutComponent } from '../objects/components/LayoutComponent'
import { EditableContainer } from '../objects/EditableContainer'

type LayoutSystemOptions = {
	scene: MainScene
	objectsFactory: EditableObjectsFactory
	logger: Logger<ILogObj>
}

/**
 * Batches layout invalidations per frame and reflows only dirty containers.
 *
 * Workflow:
 * - Containers emit `size-changed` and `hierarchy-changed` which call `invalidate`.
 * - `invalidate` schedules a single end-of-frame `flush` (POST_UPDATE).
 * - `flush` runs `reflow` for each dirty container; stretched child containers
 *   can enqueue themselves for a follow-up reflow in the same flush pass.
 */
export class LayoutSystem {
	private readonly dirtyContainers = new Set<EditableContainer>()
	private readonly queue: EditableContainer[] = []
	private flushScheduled = false
	private isFlushing = false
	private readonly maxIterations = 1000

	constructor(private readonly options: LayoutSystemOptions) {
		this.options.objectsFactory.on('obj-registered', (obj) => this.onObjectRegistered(obj), this, this.options.scene.shutdownSignal)
	}

	/**
	 * Marks a container as dirty and schedules a single end-of-frame flush.
	 * Multiple invalidations in the same frame are batched into one reflow pass.
	 */
	public invalidate(container: EditableContainer): void {
		if (!container.scene) {
			return
		}

		if (this.dirtyContainers.has(container)) {
			return
		}

		this.dirtyContainers.add(container)

		if (this.isFlushing) {
			this.queue.push(container)
			return
		}

		this.scheduleFlush()
	}

	private scheduleFlush(): void {
		if (this.flushScheduled) {
			return
		}

		// Run after user mutations for the frame so layout reflects final state.
		this.flushScheduled = true
		this.options.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, this.flush, this)
	}

	/**
	 * Applies layout to all dirty containers in a bounded loop.
	 * Containers can enqueue others (e.g., stretched child containers).
	 */
	private flush(): void {
		this.flushScheduled = false

		if (this.dirtyContainers.size === 0) {
			return
		}

		this.isFlushing = true
		this.queue.push(...this.dirtyContainers)

		let iterations = 0

		while (this.queue.length > 0) {
			if (iterations >= this.maxIterations) {
				this.options.logger.warn('LayoutSystem: max iterations exceeded, deferring remaining containers.')
				break
			}

			const container = this.queue.shift()
			if (!container) {
				continue
			}

			if (!this.dirtyContainers.has(container)) {
				continue
			}

			if (!container.scene) {
				this.dirtyContainers.delete(container)
				continue
			}

			this.reflow(container)
			this.dirtyContainers.delete(container)

			iterations += 1
		}

		this.isFlushing = false

		if (this.queue.length > 0 || this.dirtyContainers.size > 0) {
			this.queue.length = 0
			this.scheduleFlush()
		}
	}

	private reflow(container: EditableContainer): void {
		for (const child of container.editables) {
			const layout = child.components.get('layout')
			if (!(layout instanceof LayoutComponent)) {
				continue
			}

			if (!layout.active) {
				continue
			}

			const result = layout.apply(container, this.options.logger)
			if (result.resizedContainer) {
				this.invalidate(result.resizedContainer)
			}
		}
	}

	private onObjectRegistered(obj: EditableObject): void {
		if (!(obj instanceof EditableContainer)) {
			return
		}

		obj.events.on('size-changed', () => this.invalidate(obj), this, obj.preDestroySignal)
		obj.events.on('hierarchy-changed', () => this.invalidate(obj), this, obj.preDestroySignal)
	}
}
