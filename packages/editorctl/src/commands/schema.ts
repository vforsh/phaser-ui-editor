import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { normalizeDiscoveryError } from '../lib/discovery'
import { createValidationError } from '../lib/errors'
import { printJson } from '../lib/output'

export function registerSchemaCommand(program: Command, getClient: () => Promise<EditorctlClient>): void {
	program
		.command('schema')
		.argument('<method>', 'Control RPC method name')
		.description('Print JSON Schema for a control RPC method input/output')
		.action(async (method: string) => {
			try {
				const client = await getClient()
				const schema = await client.schema(method as never)

				printJson(schema)
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}
