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
		.option('-d, --detail <level>', 'Detail level: minimal, standard, verbose', 'standard')
		.action(async (options: { format?: string; group?: string; detail: 'minimal' | 'standard' | 'verbose' }) => {
			try {
				const client = await getClient()
				const meta = await client.getMeta()

				let methods = meta.methods
				if (options.group) {
					methods = methods.filter((entry) => entry.group === options.group)
				}

				methods = [...methods].sort((a, b) => a.method.localeCompare(b.method))

				if (options.detail === 'minimal') {
					const names = methods.map((m) => m.method)
					if (options.format === 'json') {
						printJson(names)
						return
					}

					process.stdout.write(`${names.join('\n')}\n`)
					return
				}

				if (options.detail === 'standard') {
					if (options.format === 'json') {
						printJson(methods.map((m) => ({ method: m.method, description: m.description })))
						return
					}

					printTable(
						['method', 'description'],
						methods.map((m) => [m.method, m.description]),
					)
					return
				}

				if (options.format === 'table') {
					printTable(
						['method', 'group', 'description'],
						methods.map((entry) => [entry.method, entry.group, entry.description]),
					)
					return
				}

				printJson(methods)
			} catch (error) {
				throw normalizeDiscoveryError(error)
			}
		})
}

function printTable(headers: string[], rows: (string | undefined)[][]): void {
	const widths = headers.map((header, index) => {
		return Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
	})

	const formatRow = (row: (string | undefined)[]) => row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  ')

	process.stdout.write(`${formatRow(headers)}\n`)
	for (const row of rows) {
		process.stdout.write(`${formatRow(row)}\n`)
	}
}
