import type { EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { PickEditorError } from '@tekton/editorctl-client'
import process from 'node:process'

import { createValidationError } from '../lib/errors'
import { printJson } from '../lib/output'

type LogsOptions = {
	json?: boolean
	file?: string
	runId?: string
	full?: boolean
	maxLines?: number
	includeSessionHeader?: boolean
}

export function registerLogsCommand(program: Command, getClient: () => Promise<EditorctlClient>): void {
	program
		.command('logs')
		.description('Print renderer log output')
		.option('--json', 'Output JSON')
		.option('--file <fileName>', 'Renderer log file name')
		.option('--run-id <runId>', 'Renderer log run id')
		.option('--full', 'Return full log content')
		.option('--max-lines <n>', 'Limit tail to the last N lines', (value) => Number.parseInt(value, 10))
		.option('--include-session-header', 'Include session header block before the tail')
		.action(async (options: LogsOptions) => {
			if (options.maxLines !== undefined) {
				if (!Number.isFinite(options.maxLines) || options.maxLines <= 0) {
					throw createValidationError('maxLines must be a positive integer.')
				}
			}

			const client = await resolveClient(getClient)
			const result = await client.fetchRendererLog({
				fileName: options.file,
				runId: options.runId,
				full: options.full,
				maxLines: options.maxLines,
			})

			if (options.json) {
				printJson(result)
				return
			}

			const chunks: string[] = []
			if (options.includeSessionHeader && result.sessionHeader?.text.length) {
				chunks.push(result.sessionHeader.text.join('\n'))
			}

			if (result.tail.text.length) {
				chunks.push(result.tail.text.join('\n'))
			}

			if (chunks.length === 0) {
				return
			}

			process.stdout.write(`${chunks.join('\n')}\n`)
		})
}

async function resolveClient(getClient: () => Promise<EditorctlClient>): Promise<EditorctlClient> {
	try {
		return await getClient()
	} catch (error) {
		throw toDiscoveryValidationError(error)
	}
}

function toDiscoveryValidationError(error: unknown): Error {
	if (error instanceof PickEditorError) {
		if (error.reason === 'no-editors') {
			return createValidationError('No running Tekton Editor instances found. Start the app or pass --port.')
		}
		if (error.reason === 'no-match') {
			return createValidationError('No editor matched the requested target. Check --port or run editorctl discover.')
		}
	}

	return error instanceof Error ? error : new Error(String(error))
}
