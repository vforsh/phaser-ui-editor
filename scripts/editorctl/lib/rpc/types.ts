import type { BackendInput, BackendMethod, BackendOutput } from '../../../../src/backend-contract/types'

export type { BackendInput, BackendMethod, BackendOutput }

export interface JsonRpcRequest<M extends BackendMethod = BackendMethod> {
	jsonrpc: '2.0'
	id: string
	method: M
	params: BackendInput<M>
}

export interface JsonRpcResponse<M extends BackendMethod = BackendMethod> {
	jsonrpc: '2.0'
	id: string | null
	result?: BackendOutput<M>
	error?: {
		code: number
		message: string
		data?: unknown
	}
}

export type InputFor<M extends BackendMethod> = BackendInput<M>
export type OutputFor<M extends BackendMethod> = BackendOutput<M>
