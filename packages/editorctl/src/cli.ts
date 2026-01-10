#!/usr/bin/env node

import { connect, type DiscoveredEditor } from '@tekton/editorctl-client'
import { Command } from 'commander'
import process from 'node:process'

import { registerCallCommand } from './commands/call'
import { registerDiscoverCommand } from './commands/discover'
import { registerHelpCommand } from './commands/help'
import { registerLogsCommand } from './commands/logs'
import { registerMethodsCommand } from './commands/methods'
import { registerSchemaCommand } from './commands/schema'
import { registerTargetCommand } from './commands/target'
import { wasPortFlagProvided } from './lib/cli-args'
import { createValidationError, handleError } from './lib/errors'
import { findNearestRepoRoot, normalizePath } from './lib/repoRoot'
import { getEditorctlRuntimeMode } from './lib/runtimeMode'

const DEFAULT_PORT = Number.parseInt(process.env.EDITOR_CONTROL_WS_PORT ?? '17870', 10)

const program = new Command()

program
	.name('editorctl')
	.description('Control Tekton Editor via JSON-RPC')
	.option('-p, --port <number>', 'WebSocket port', (val) => Number.parseInt(val, 10), DEFAULT_PORT)
	.configureHelp({
		helpWidth: 100,
		subcommandTerm: (cmd) => {
			let usage = cmd.usage()
			if (cmd.options.length <= 1) {
				usage = usage.replace('[options] ', '').trim()
			}
			return usage ? `${cmd.name()} ${usage}` : cmd.name()
		},
		subcommandDescription: (cmd) => {
			const description = cmd.description()
			const aliases = cmd.aliases()
			if (aliases.length > 0) {
				return `${description} (aliases: ${aliases.join(', ')})`
			}
			return description
		},
	})

/**
 * Connects to an editor and validates worktree targeting in dev mode.
 *
 * In dev mode (tsx with .ts entrypoint), strictly enforces that the target
 * editor was launched from the same worktree (appLaunchDir matches repo root).
 *
 * @returns The connected client.
 * @throws ValidationError if the target editor is from a different worktree (dev mode only).
 */
const getClient = async () => {
	const { client } = await getClientAndEditor()
	return client
}

/**
 * Connects to an editor and returns both the client and editor record.
 *
 * In dev mode, strictly validates that the target editor's appLaunchDir
 * matches the current worktree's repo root.
 */
export async function getClientAndEditor(): Promise<{ client: Awaited<ReturnType<typeof connect>>['client']; editor: DiscoveredEditor }> {
	const runtimeMode = getEditorctlRuntimeMode()
	const repoRoot = await findNearestRepoRoot(process.cwd())

	if (wasPortFlagProvided()) {
		const options = program.opts()
		const { client, editor } = await connect({ pick: { prefer: { port: options.port }, fallback: 'error' } })

		if (runtimeMode === 'dev') {
			await validateWorktreeMatch(editor, repoRoot, runtimeMode)
		}

		return { client, editor }
	}

	if (runtimeMode === 'dev') {
		// In dev mode: strict match on appLaunchDir, fail if no match
		const { client, editor } = await connect({ pick: { prefer: { appLaunchDir: repoRoot }, fallback: 'error' } })
		return { client, editor }
	}

	// Built mode: use default connect() behavior (prefers appLaunchDir, but falls back gracefully)
	const { client, editor } = await connect()
	return { client, editor }
}

/**
 * Validates that the target editor was launched from the expected worktree.
 *
 * @throws ValidationError if appLaunchDir doesn't match the expected repo root.
 */
async function validateWorktreeMatch(editor: DiscoveredEditor, expectedRepoRoot: string, runtimeMode: 'dev' | 'built'): Promise<void> {
	const expectedNormalized = await normalizePath(expectedRepoRoot)
	const actualNormalized = await normalizePath(editor.appLaunchDir)

	if (expectedNormalized !== actualNormalized) {
		throw createValidationError(
			`Target editor is from a different worktree: expected launchDir="${expectedNormalized}", got launchDir="${actualNormalized}" (wsPort=${editor.wsPort}, instanceId=${editor.instanceId}).`,
			{
				expectedAppLaunchDir: expectedNormalized,
				actualAppLaunchDir: actualNormalized,
				wsPort: editor.wsPort,
				instanceId: editor.instanceId,
				runtimeMode,
			},
		)
	}
}

registerDiscoverCommand(program)
registerTargetCommand(program, getClientAndEditor)
registerCallCommand(program, getClient)
registerLogsCommand(program, getClient)
registerMethodsCommand(program, getClient)
registerSchemaCommand(program, getClient)
registerHelpCommand(program, getClient)

program.parseAsync(process.argv).catch((error: unknown) => {
	handleError(error)
})
