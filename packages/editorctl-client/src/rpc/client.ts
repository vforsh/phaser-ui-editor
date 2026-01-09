import type { RpcError } from '../errors'
import type { ControlMethod, JsonRpcRequest, JsonRpcResponse, OutputFor } from './types'

import { WsTransport } from '../transport/ws'
import { generateId } from './id'

export class RpcClient {
	constructor(private transport: WsTransport) {}

	async request<M extends ControlMethod>(method: M, params: JsonRpcRequest<M>['params']): Promise<OutputFor<M>> {
		const request: JsonRpcRequest<M> = {
			jsonrpc: '2.0',
			id: generateId(),
			method,
			params,
		}

		const responseText = await this.transport.send(JSON.stringify(request))
		const response = JSON.parse(responseText) as JsonRpcResponse<M>

		if (response.error) {
			const err = new Error(response.error.message || 'RPC error') as RpcError
			err.isRpcError = true
			err.code = response.error.code
			err.data = response.error.data
			throw err
		}

		return response.result as OutputFor<M>
	}
}
