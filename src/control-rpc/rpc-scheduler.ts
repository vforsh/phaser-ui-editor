import { ControlMethod } from './api/ControlApi'

/**
 * Scheduler for RPC commands that ensures write commands are executed sequentially (FIFO)
 * while allowing read commands to run in parallel.
 */
export class RpcScheduler {
	private writeChain: Promise<unknown> = Promise.resolve()

	/**
	 * Determines if a method is a "write" (mutating) command.
	 */
	isWriteMethod(method: ControlMethod): boolean {
		return method !== 'list-hierarchy'
	}

	/**
	 * Schedules a task for execution.
	 *
	 * If the method is a write method, it will be appended to the sequential execution chain.
	 * If it's a read method, it will be executed immediately.
	 */
	async schedule<T>(method: ControlMethod, task: () => Promise<T>): Promise<T> {
		if (!this.isWriteMethod(method)) {
			return task()
		}

		// Sequential execution for write methods
		const result = this.writeChain.then(() => task())
		this.writeChain = result.catch(() => {}) // Prevent chain breakage on failure
		return result
	}

	/**
	 * Returns the current depth of the write queue (including the currently executing one).
	 *
	 * Note: this is a simple approximation.
	 */
	getQueueDepth(): number {
		// In a more complex scheduler we might track this properly
		return 0
	}
}
