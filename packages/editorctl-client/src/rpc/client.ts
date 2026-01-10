import type { ControlMethod, JsonRpcRequest, JsonRpcResponse, OutputFor } from './types'

import { isTransportError, TransportError } from '../transport/TransportError'
import { WsTransport } from '../transport/ws'
import { generateId } from './id'
import { RpcError } from './RpcError'

export interface RpcClientContext {
	port: number
	instanceId?: string
}

export class RpcClient {
	constructor(
		private transport: WsTransport,
		private context: RpcClientContext,
	) {}

	async request<M extends ControlMethod>(method: M, params: JsonRpcRequest<M>['params']): Promise<OutputFor<M>> {
		const request: JsonRpcRequest<M> = {
			jsonrpc: '2.0',
			id: generateId(),
			method,
			params,
		}

		try {
			const responseText = await this.transport.send(JSON.stringify(request))
			const response = JSON.parse(responseText) as JsonRpcResponse<M>

			if (response.error) {
				throw new RpcError(response.error.message || 'RPC error', {
					code: response.error.code,
					data: response.error.data,
					method,
					port: this.context.port,
					instanceId: this.context.instanceId,
				})
			}

			return response.result as OutputFor<M>
		} catch (err) {
			if (isTransportError(err)) {
				throw new TransportError(err.message, {
					cause: err.cause,
					port: err.port ?? this.context.port,
					method,
					instanceId: this.context.instanceId,
				})
			}
			throw err
		}
	}
}
