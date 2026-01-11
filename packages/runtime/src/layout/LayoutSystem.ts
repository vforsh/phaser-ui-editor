export type LayoutLogger = {
	warn(message: string): void
}

export type LayoutApplier<TContainer> = {
	active: boolean
	apply(parent: TContainer, logger: LayoutLogger): { resizedContainer?: TContainer } | void
}

export type LayoutSystemOptions<TContainer, TChild> = {
	scheduleFlush: (flush: () => void) => void
	isAlive: (container: TContainer) => boolean
	getChildren: (container: TContainer) => readonly TChild[]
	getLayoutApplier: (child: TChild) => LayoutApplier<TContainer> | null
	logger: LayoutLogger
	maxIterations?: number
}

/**
 * Batches layout invalidations per frame and reflows only dirty containers.
 */
export class LayoutSystem<TContainer, TChild> {
	private readonly dirtyContainers = new Set<TContainer>()
	private readonly queue: TContainer[] = []
	private flushScheduled = false
	private isFlushing = false
	private readonly maxIterations: number

	constructor(private readonly options: LayoutSystemOptions<TContainer, TChild>) {
		this.maxIterations = options.maxIterations ?? 1000
	}

	/**
	 * Marks a container as dirty and schedules a single end-of-frame flush.
	 * Multiple invalidations in the same frame are batched into one reflow pass.
	 */
	public invalidate(container: TContainer): void {
		if (!this.options.isAlive(container)) {
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

		this.flushScheduled = true
		this.options.scheduleFlush(() => this.flush())
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

			if (!this.options.isAlive(container)) {
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

	private reflow(container: TContainer): void {
		for (const child of this.options.getChildren(container)) {
			const layout = this.options.getLayoutApplier(child)
			if (!layout) {
				continue
			}

			if (!layout.active) {
				continue
			}

			const result = layout.apply(container, this.options.logger)
			if (result?.resizedContainer) {
				this.invalidate(result.resizedContainer)
			}
		}
	}
}
