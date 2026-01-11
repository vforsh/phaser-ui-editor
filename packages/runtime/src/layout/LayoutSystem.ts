/**
 * Minimal logging surface used by {@link LayoutSystem}.
 *
 * This is intentionally tiny so the runtime package stays framework-agnostic and
 * can be wired to `console`, a structured logger, or a no-op logger.
 */
export type LayoutLogger = {
	/**
	 * Emits a warning message.
	 *
	 * Used for "should never happen" situations where the system can recover by
	 * deferring work (e.g. hitting {@link LayoutSystemOptions.maxIterations}).
	 */
	warn(message: string): void
}

export type LayoutApplier<TContainer> = {
	/**
	 * Whether this applier should currently participate in layout.
	 *
	 * Inactive appliers are skipped during reflow.
	 */
	active: boolean

	/**
	 * Applies layout under a given parent container.
	 *
	 * Implementations may mutate the scene graph (sizes/positions), and can
	 * optionally return a container that should be re-laid out as a consequence of
	 * this change (e.g. a stretched container whose parent depends on its new
	 * bounds).
	 *
	 * @param parent - The container whose children are being laid out.
	 * @param logger - Logger to use for recoverable warnings.
	 * @returns Optional object containing a `resizedContainer` to invalidate.
	 */
	apply(parent: TContainer, logger: LayoutLogger): { resizedContainer?: TContainer } | void
}

export type LayoutSystemOptions<TContainer, TChild> = {
	/**
	 * Schedules a flush callback.
	 *
	 * This should enqueue `flush` to run once at the "end of frame" for your
	 * environment (e.g. requestAnimationFrame, Phaser POST_UPDATE, etc).
	 *
	 * Note: {@link LayoutSystem} already de-duplicates flush scheduling, so this
	 * can be implemented as "schedule every time" without worrying about
	 * duplicates.
	 */
	scheduleFlush: (flush: () => void) => void

	/**
	 * Returns whether a container is still valid/alive.
	 *
	 * {@link LayoutSystem} calls this before enqueueing work and again before
	 * reflowing. Returning `false` must be safe and should not throw.
	 */
	isAlive: (container: TContainer) => boolean

	/**
	 * Returns the current children of a container, in the order they should be
	 * processed for layout.
	 */
	getChildren: (container: TContainer) => readonly TChild[]

	/**
	 * Extracts a layout applier from a child object.
	 *
	 * Return `null` for children that do not participate in layout.
	 */
	getLayoutApplier: (child: TChild) => LayoutApplier<TContainer> | null

	/**
	 * Logger used for recoverable warnings.
	 */
	logger: LayoutLogger

	/**
	 * Hard cap on the number of containers reflowed in a single flush.
	 *
	 * This prevents infinite loops where layout changes continuously re-invalidate
	 * containers. When exceeded, remaining containers are deferred to the next
	 * scheduled flush and a warning is emitted.
	 *
	 * @defaultValue `1000`
	 */
	maxIterations?: number
}

/**
 * Batches layout invalidations per frame and reflows only dirty containers.
 *
 * {@link LayoutSystem.invalidate} can be called many times during a frame; the
 * system will schedule a single flush and reflow each dirty container at most
 * once per flush pass.
 *
 * The system is resilient to "mid-flush" invalidations: if an applier causes
 * another container to require layout, it can return `resizedContainer` and the
 * system will enqueue it for the current or next flush as needed.
 */
export class LayoutSystem<TContainer, TChild> {
	private readonly dirtyContainers = new Set<TContainer>()
	private readonly queue: TContainer[] = []
	private flushScheduled = false
	private isFlushing = false
	private readonly maxIterations: number

	/**
	 * Creates a {@link LayoutSystem}.
	 *
	 * @param options - Adapter functions that let the system traverse your
	 * container tree and invoke layout appliers.
	 */
	constructor(private readonly options: LayoutSystemOptions<TContainer, TChild>) {
		this.maxIterations = options.maxIterations ?? 1000
	}

	/**
	 * Marks a container as dirty and schedules a single end-of-frame flush.
	 * Multiple invalidations in the same frame are batched into one reflow pass.
	 *
	 * If `container` is not alive (per {@link LayoutSystemOptions.isAlive}), this
	 * is a no-op.
	 *
	 * @param container - Container to reflow on the next flush.
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
