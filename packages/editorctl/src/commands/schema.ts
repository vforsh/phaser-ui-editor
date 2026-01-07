import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { normalizeDiscoveryError } from '../lib/discovery'
import { createValidationError } from '../lib/errors'
import { printJson } from '../lib/output'

export function registerSchemaCommand(program: Command, getClient: () => EditorctlClient): void {
	program
		.command('schema')
		.argument('<method>', 'Control RPC method name')
		.description('Print JSON Schema for a control RPC method input/output')
		.action(async (method: string) => {
			try {
				const client = getClient()
				const meta = await client.methods()
				const entry = meta.methods.find((item) => item.method === method)
				if (!entry) {
					throw createValidationError('Unknown method. Run `editorctl methods`.')
				}

				printJson({ method: entry.method, inputSchema: entry.inputSchema, outputSchema: entry.outputSchema })
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}
