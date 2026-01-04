/**
 * Shared IPC channel names used across main/preload/renderer.
 *
 * Keep these in one place to avoid string drift and hard-to-debug mismatches.
 */
export const CHANNELS = {
	/**
	 * Renderer → main: forward uncaught error stacks so they can be written into `./logs/renderer-*.log`.
	 */
	ERROR_STACK_REPORTER: 'renderer-log:error-stack',
} as const
