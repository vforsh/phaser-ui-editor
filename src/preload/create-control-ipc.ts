import { ipcRenderer } from 'electron'

import type { ControlIpc } from '../renderer/control-rpc/rpc'

import { CONTROL_EDITOR_STATUS_CHANNEL, CONTROL_RPC_REQUEST_CHANNEL, CONTROL_RPC_RESPONSE_CHANNEL } from '../renderer/control-rpc/rpc'

/**
 * Creates a bridge for the control JSON-RPC API.
 * This is used for external tools to control the editor.
 */
export function createControlIpc(): ControlIpc {
	return {
		onRpcRequest: (handler) => {
			const listener = (_event: Electron.IpcRendererEvent, request: unknown) => {
				handler(request as never)
			}

			ipcRenderer.on(CONTROL_RPC_REQUEST_CHANNEL, listener)
			return () => ipcRenderer.removeListener(CONTROL_RPC_REQUEST_CHANNEL, listener)
		},
		sendRpcResponse: (response) => {
			ipcRenderer.send(CONTROL_RPC_RESPONSE_CHANNEL, response)
		},
		sendEditorStatus: (status) => {
			ipcRenderer.send(CONTROL_EDITOR_STATUS_CHANNEL, status)
		},
	}
}
