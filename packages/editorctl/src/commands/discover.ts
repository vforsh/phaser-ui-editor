import type { Command } from 'commander'

import { discoverEditors } from '@tekton/editorctl-client'
import process from 'node:process'

import { formatDiscoveredEditor, getLogsDir } from '../lib/discovered-editor-format'
import { printJson } from '../lib/output'

const DEFAULT_TIMEOUT_MS = 400

type DiscoverOptions = {
	json?: boolean
	ping?: boolean
	timeout?: number
}

export function registerDiscoverCommand(program: Command): void {
	program
		.command('discover')
		.aliases(['ls', 'editors'])
		.description('List running Tekton Editor instances')
		.option('--json', 'Output JSON')
		.option('--no-ping', 'Skip ping verification')
		.option('--timeout <ms>', 'Ping timeout in milliseconds', (value) => Number.parseInt(value, 10), DEFAULT_TIMEOUT_MS)
		.action(async (options: DiscoverOptions) => {
			const entries = await discoverEditors({
				ping: options.ping,
				pingTimeoutMs: options.timeout,
			})

			if (options.json) {
				printJson(entries.map((entry) => ({ ...entry, logsDir: getLogsDir(entry) })))
				return
			}

			for (const entry of entries) {
				process.stdout.write(`${formatDiscoveredEditor(entry)}\n`)
			}
		})
}
