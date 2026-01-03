import { contextBridge, ipcRenderer } from 'electron'
import { backendContract } from '../backend-contract/contract'
import type { BackendApi, BackendMethod } from '../backend-contract/types'
import { createControlIpc } from './control-rpc/preload'

const CHANNEL_PREFIX = 'backend:'
const MENU_TAKE_CANVAS_SCREENSHOT = 'menu:take-canvas-screenshot'

const backend = (Object.keys(backendContract) as BackendMethod[]).reduce((api, method) => {
	api[method] = ((input) => ipcRenderer.invoke(`${CHANNEL_PREFIX}${method}`, input)) as BackendApi[BackendMethod]
	return api
}, {} as BackendApi)

contextBridge.exposeInMainWorld('backend', backend)

contextBridge.exposeInMainWorld('appMenu', {
	onTakeCanvasScreenshot: (callback: (payload: { clean?: boolean }) => void) => {
		const listener = (_event: unknown, payload: { clean?: boolean }) => {
			callback(payload ?? {})
		}

		ipcRenderer.on(MENU_TAKE_CANVAS_SCREENSHOT, listener)

		return () => {
			ipcRenderer.off(MENU_TAKE_CANVAS_SCREENSHOT, listener)
		}
	},
})

if (process.env.NODE_ENV !== 'production') {
	contextBridge.exposeInMainWorld('controlIpc', createControlIpc())
}
