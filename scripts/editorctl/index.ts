#!/usr/bin/env node

import { Command } from 'commander'
import process from 'node:process'
import { registerAllCommands } from './commands'
import { createCtx, Ctx } from './lib/context'
import { handleError } from './lib/errors'

const DEFAULT_PORT = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)

const program = new Command()

program
	.name('editorctl')
	.description('Control Phaser UI Editor via JSON-RPC')
	.option('--port <number>', 'WebSocket port', (val) => Number.parseInt(val, 10), DEFAULT_PORT)
	.option('--json', 'Output raw JSON', false)

// Create a lazy context that will use the parsed options
const ctx = new Proxy({} as Ctx, {
	get(_, prop) {
		const options = program.opts()
		const actualCtx = createCtx({
			port: options.port,
			outputMode: options.json ? 'json' : 'human',
		})
		return actualCtx[prop as keyof Ctx]
	},
})

// Register all commands
registerAllCommands(program, ctx)

program.parseAsync(process.argv).catch((error: unknown) => {
	handleError(error, program.opts().json)
})
