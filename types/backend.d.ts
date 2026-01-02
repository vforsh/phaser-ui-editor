import type { BackendApi } from '../src/backend-contract/types'

declare global {
	interface Window {
		backend: BackendApi
	}
}

export {}
