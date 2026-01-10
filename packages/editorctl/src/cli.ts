#!/usr/bin/env node

import { connect, createClient } from '@tekton/editorctl-client'
import { Command } from 'commander'
import process from 'node:process'

import { registerCallCommand } from './commands/call'
import { registerDiscoverCommand } from './commands/discover'
import { registerHelpCommand } from './commands/help'
import { registerMethodsCommand } from './commands/methods'
import { registerSchemaCommand } from './commands/schema'
import { registerTargetCommand } from './commands/target'
import { wasPortFlagProvided } from './lib/cli-args'
import { handleError } from './lib/errors'

const DEFAULT_PORT = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)

const program = new Command()

program
	.name('editorctl')
	.description('Control Tekton Editor via JSON-RPC')
	.option('-p, --port <number>', 'WebSocket port', (val) => Number.parseInt(val, 10), DEFAULT_PORT)

const getClient = async () => {
	const options = program.opts()
	if (wasPortFlagProvided()) {
		return createClient({ port: options.port })
	}

	const { client } = await connect()
	return client
}

registerDiscoverCommand(program)
registerCallCommand(program, getClient)
registerMethodsCommand(program, getClient)
registerSchemaCommand(program, getClient)
registerHelpCommand(program, getClient)
registerTargetCommand(program)

program.parseAsync(process.argv).catch((error: unknown) => {
	handleError(error)
})
