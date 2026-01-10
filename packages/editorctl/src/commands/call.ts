import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { parseJsonObject, parseJsonText } from '../lib/json-input'
import { printJson } from '../lib/output'

export function registerCallCommand(program: Command, getClient: () => Promise<EditorctlClient>): void {
	program
		.command('call')
		.argument('<method>', 'Control RPC method name')
		.argument('[input]', 'JSON object params')
		.description('Call a control RPC method by name with JSON params as a positional argument')
		.action(async (method: string, input?: string) => {
			const client = await getClient()
			const params = readParamsFromPositionalArg(input)
			const result = await client.call(method as never, params as never)
			printJson(result)
		})
}

function readParamsFromPositionalArg(input: string | undefined): Record<string, unknown> {
	if (input === undefined) {
		return {}
	}

	const raw = parseJsonText(input)
	return parseJsonObject(raw)
}
