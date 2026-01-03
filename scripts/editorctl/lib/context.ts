import { createOutputFacade, OutputFacade } from './output'
import { RpcClient } from './rpc/client'
import { WsTransport } from './transport/ws'

export interface Config {
	port: number
	outputMode: 'json' | 'human'
}

export interface Ctx {
	readonly config: Config
	readonly rpc: RpcClient
	readonly output: OutputFacade
}

/**
 * Creates a context object that can be used by commands.
 * If config is provided, it's used directly.
 * If not, it's expected that the context will be initialized later or used in a way that handles missing config.
 */
export function createCtx(config: Config): Ctx {
	const transport = new WsTransport({ port: config.port })
	const rpc = new RpcClient(transport)
	const output = createOutputFacade({ mode: config.outputMode })

	return {
		config,
		rpc,
		output,
	}
}
