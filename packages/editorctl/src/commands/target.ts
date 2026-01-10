import type { DiscoveredEditor } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import process from 'node:process'

import { formatDiscoveredEditor, getLogsDir } from '../lib/discovered-editor-format'
import { printJson } from '../lib/output'

type TargetOptions = {
	json?: boolean
}

type GetClientAndEditor = () => Promise<{ client: unknown; editor: DiscoveredEditor }>

export function registerTargetCommand(program: Command, getClientAndEditor: GetClientAndEditor): void {
	program
		.command('target')
		.alias('ping')
		.description('Show the editor instance that would be targeted')
		.option('--json', 'Output JSON')
		.action(async (options: TargetOptions) => {
			const { editor } = await getClientAndEditor()

			if (options.json) {
				printJson({ ...editor, logsDir: getLogsDir(editor) })
				return
			}

			process.stdout.write(`${formatDiscoveredEditor(editor)}\n`)
		})
}
