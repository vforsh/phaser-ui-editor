import type { ControlInput, ControlMethod, ControlOutput } from '../../../../src/control-rpc/api/ControlApi'

export type { ControlInput, ControlMethod, ControlOutput }

export interface JsonRpcRequest<M extends ControlMethod = ControlMethod> {
	jsonrpc: '2.0'
	id: string
	method: M
	params: ControlInput<M>
}

export interface JsonRpcResponse<M extends ControlMethod = ControlMethod> {
	jsonrpc: '2.0'
	id: string | null
	result?: ControlOutput<M>
	error?: {
		code: number
		message: string
		data?: unknown
	}
}

export type InputFor<M extends ControlMethod> = ControlInput<M>
export type OutputFor<M extends ControlMethod> = ControlOutput<M>
