import { contextBridge, ipcRenderer } from 'electron'
import { backendContract } from '../backend-contract/contract'
import type { BackendApi, BackendMethod } from '../backend-contract/types'
import { createControlIpc } from './control-rpc/preload'

const CHANNEL_PREFIX = 'backend:'

const backend = (Object.keys(backendContract) as BackendMethod[]).reduce((api, method) => {
	api[method] = ((input) => ipcRenderer.invoke(`${CHANNEL_PREFIX}${method}`, input)) as BackendApi[BackendMethod]
	return api
}, {} as BackendApi)

contextBridge.exposeInMainWorld('backend', backend)

if (process.env.NODE_ENV !== 'production') {
	contextBridge.exposeInMainWorld('controlIpc', createControlIpc())
}
