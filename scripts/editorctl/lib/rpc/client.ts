import { WsTransport } from '../transport/ws'
import { generateId } from './id'
import { BackendMethod, JsonRpcRequest, JsonRpcResponse, OutputFor } from './types'

export class RpcClient {
	constructor(private transport: WsTransport) {}

	async request<M extends BackendMethod>(method: M, params: JsonRpcRequest<M>['params']): Promise<OutputFor<M>> {
		const request: JsonRpcRequest<M> = {
			jsonrpc: '2.0',
			id: generateId(),
			method,
			params,
		}

		const responseText = await this.transport.send(JSON.stringify(request))
		const response = JSON.parse(responseText) as JsonRpcResponse<M>

		if (response.error) {
			const err = new Error(response.error.message || 'RPC error')
			// @ts-expect-error - attaching rpc error flag
			err.isRpcError = true
			throw err
		}

		return response.result as OutputFor<M>
	}
}
