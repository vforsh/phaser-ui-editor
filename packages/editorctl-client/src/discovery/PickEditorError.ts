import type { DiscoveredEditor } from './discoverEditors'
import type { PickEditorOptions } from './pickEditor'

/**
 * Reason for a {@link PickEditorError}.
 */
export type PickEditorErrorReason = 'invalid-prefer' | 'no-editors' | 'no-match' | 'ping-failed'

/**
 * Structured details for a {@link PickEditorError}.
 */
export interface PickEditorErrorDetails {
	providedKeys?: string[]
	port?: number
	includesValue?: string
}

/**
 * Error thrown when {@link pickEditor} fails to find a suitable editor instance.
 */
export class PickEditorError extends Error {
	constructor(
		message: string,
		public readonly reason: PickEditorErrorReason,
		public readonly options: PickEditorOptions,
		public readonly discovered?: DiscoveredEditor[],
		public readonly details?: PickEditorErrorDetails,
		options_?: { cause?: unknown },
	) {
		super(message, options_)
		this.name = 'PickEditorError'
	}
}
