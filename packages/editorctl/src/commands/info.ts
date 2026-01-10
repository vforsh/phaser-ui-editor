import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import process from 'node:process'

import { createInputHelpText } from '../help/json-schema-input-help'
import { normalizeDiscoveryError } from '../lib/discovery'
import { createValidationError } from '../lib/errors'

export function registerInfoCommand(program: Command, getClient: () => Promise<EditorctlClient>): void {
	program
		.command('info')
		.argument('<method>', 'Control RPC method name')
		.description('Show JSON input help for a specific control RPC method')
		.action(async (method: string) => {
			try {
				const client = await getClient()
				const schema = await client.schema(method as never)
				const helpText = createInputHelpText({ method, inputSchema: schema.inputSchema })
				process.stdout.write(`${helpText}\n`)
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}
