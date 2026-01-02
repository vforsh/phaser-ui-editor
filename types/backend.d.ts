import type { BackendApi } from '../src/backend-contract/types'
import type { ControlIpc } from '../src/control-rpc/rpc'

declare global {
	interface Window {
		backend: BackendApi
		controlIpc?: ControlIpc
	}
}

export {}
