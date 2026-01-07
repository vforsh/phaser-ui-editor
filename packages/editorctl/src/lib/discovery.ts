import { createValidationError } from './errors'

const DISCOVERY_METHOD = 'getControlMeta'

export function normalizeDiscoveryError(error: unknown): unknown {
	if (error instanceof Error && error.message.includes(`unknown method '${DISCOVERY_METHOD}'`)) {
		return createValidationError(
			`Running app does not support discovery (\`${DISCOVERY_METHOD}\`). Update Tekton Editor to a newer version.`,
		)
	}

	return error
}
