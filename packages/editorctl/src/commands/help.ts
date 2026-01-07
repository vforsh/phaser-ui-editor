import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import process from 'node:process'

import { createInputHelpText } from '../help/json-schema-input-help'
import { normalizeDiscoveryError } from '../lib/discovery'
import { createValidationError } from '../lib/errors'

export function registerHelpCommand(program: Command, getClient: () => EditorctlClient): void {
	program
		.command('help')
		.argument('[method]', 'Control RPC method name')
		.description('Show general help or method-specific JSON input help')
		.action(async (method?: string) => {
			if (!method) {
				program.outputHelp()
				return
			}

			try {
				const client = getClient()
				const meta = await client.methods()
				const entry = meta.methods.find((item) => item.method === method)
				if (!entry) {
					throw createValidationError('Unknown method. Run `editorctl methods`.')
				}

				const helpText = createInputHelpText({ method, inputSchema: entry.inputSchema })
				process.stdout.write(`${helpText}\n`)
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}
