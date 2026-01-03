import type { BackendApi } from '../src/renderer/backend-contract/types'
import type { ControlIpc } from '../src/renderer/control-rpc/rpc'

declare global {
	interface Window {
		backend: BackendApi
		controlIpc?: ControlIpc
	}
}

export {}
