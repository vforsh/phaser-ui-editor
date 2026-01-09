#!/usr/bin/env node

import { createClient } from '@tekton/editorctl-client'
import { Command } from 'commander'
import process from 'node:process'

import { registerCallCommand } from './commands/call'
import { registerDiscoverCommand } from './commands/discover'
import { registerHelpCommand } from './commands/help'
import { registerLogsFetchCommand } from './commands/logs-fetch'
import { registerLogsListCommand } from './commands/logs-list'
import { registerMethodsCommand } from './commands/methods'
import { registerSchemaCommand } from './commands/schema'
import { handleError } from './lib/errors'

const DEFAULT_PORT = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)

const program = new Command()

program
	.name('editorctl')
	.description('Control Tekton Editor via JSON-RPC')
	.option('--port <number>', 'WebSocket port', (val) => Number.parseInt(val, 10), DEFAULT_PORT)

const getClient = () => {
	const options = program.opts()
	return createClient({ port: options.port })
}

registerCallCommand(program, getClient)
registerDiscoverCommand(program)
registerLogsListCommand(program)
registerLogsFetchCommand(program)
registerMethodsCommand(program, getClient)
registerSchemaCommand(program, getClient)
registerHelpCommand(program, getClient)

program.parseAsync(process.argv).catch((error: unknown) => {
	handleError(error)
})
