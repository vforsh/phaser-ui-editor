import type { DiscoveredEditor } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { connect } from '@tekton/editorctl-client'
import process from 'node:process'

import { wasPortFlagProvided } from '../lib/cli-args'
import { formatDiscoveredEditor, getLogsDir } from '../lib/discovered-editor-format'
import { printJson } from '../lib/output'

type TargetOptions = {
	json?: boolean
}

export function registerTargetCommand(program: Command): void {
	program
		.command('target')
		.alias('ping')
		.description('Show the editor instance that would be targeted')
		.option('--json', 'Output JSON')
		.action(async (options: TargetOptions) => {
			const entry = await resolveTarget(program)

			if (options.json) {
				printJson({ ...entry, logsDir: getLogsDir(entry) })
				return
			}

			process.stdout.write(`${formatDiscoveredEditor(entry)}\n`)
		})
}

async function resolveTarget(program: Command): Promise<DiscoveredEditor> {
	if (wasPortFlagProvided()) {
		const { port } = program.opts()
		const { editor } = await connect({ pick: { prefer: { port } } })
		return editor
	}

	const { editor } = await connect()
	return editor
}
