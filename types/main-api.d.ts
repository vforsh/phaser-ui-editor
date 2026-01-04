import type { MainApi } from '../src/backend/contract/contract'
import type { ControlIpc } from '../src/renderer/control-rpc/rpc'

declare global {
	interface Window {
		mainApi: MainApi
		controlIpc?: ControlIpc
	}
}

export {}
