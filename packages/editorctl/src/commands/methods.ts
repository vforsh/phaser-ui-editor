import type { ControlMetaMethod, EditorctlClient } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import process from 'node:process'

import { normalizeDiscoveryError } from '../lib/discovery'
import { printJson } from '../lib/output'

export function registerMethodsCommand(program: Command, getClient: () => Promise<EditorctlClient>): void {
	program
		.command('methods')
		.description('List available control RPC methods and metadata')
		.option('--format <format>', 'Output format: json or table', 'json')
		.option('--group <name>', 'Filter by method group')
		.action(async (options: { format?: string; group?: string }) => {
			try {
				const client = await getClient()
				const meta = await client.getMeta()

				let methods = meta.methods
				if (options.group) {
					methods = methods.filter((entry) => entry.group === options.group)
				}

				if (options.format === 'table') {
					printMethodsTable(methods)
					return
				}

				printJson(methods)
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}

function printMethodsTable(methods: ControlMetaMethod[]): void {
	const rows = methods.map((entry) => [entry.method, entry.group, entry.description])
	const headers = ['method', 'group', 'description']

	const widths = headers.map((header, index) => {
		return Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
	})

	const formatRow = (row: string[]) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ')

	process.stdout.write(`${formatRow(headers)}\n`)
	for (const row of rows) {
		process.stdout.write(`${formatRow(row)}\n`)
	}
}
