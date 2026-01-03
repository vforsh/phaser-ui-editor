#!/usr/bin/env node

import { Command } from 'commander'
import process from 'node:process'
import { createCtx, Ctx } from './lib/context'
import { handleError } from './lib/errors'
import { registerContractCommands, registerIntrospectionCommands } from './registerContractCommands'

const DEFAULT_PORT = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)

const program = new Command()

program
	.name('editorctl')
	.description('Control Tekton Editor via JSON-RPC')
	.option('--port <number>', 'WebSocket port', (val) => Number.parseInt(val, 10), DEFAULT_PORT)

// Create a lazy context that will use the parsed options
const ctx = new Proxy({} as Ctx, {
	get(_, prop) {
		const options = program.opts()
		const actualCtx = createCtx({
			port: options.port,
		})
		return actualCtx[prop as keyof Ctx]
	},
})

registerContractCommands(program, ctx)
registerIntrospectionCommands(program)

program.parseAsync(process.argv).catch((error: unknown) => {
	handleError(error)
})
