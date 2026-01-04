import type { ControlIpc } from '../src/renderer/control-rpc/rpc'
import type { ErrorStackReporter } from '../src/shared/ipc/errorStackReporterTypes'
import type { MainApi } from '../src/shared/main-api/MainApi'

declare global {
	interface Window {
		mainApi: MainApi
		controlIpc?: ControlIpc
		errorStackReporter?: ErrorStackReporter
	}
}

export {}
