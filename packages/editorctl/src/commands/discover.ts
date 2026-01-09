import type { DiscoveredEditor } from '@tekton/editorctl-client'
import type { Command } from 'commander'

import { discoverEditors } from '@tekton/editorctl-client'
import path from 'node:path'
import process from 'node:process'

import { printJson } from '../lib/output'

const DEFAULT_TIMEOUT_MS = 400

type DiscoverOptions = {
	json?: boolean
	ping?: boolean
	timeout?: number
}

export function registerDiscoverCommand(program: Command): void {
	registerCommand(program, 'discover', 'List running Tekton Editor instances')
	registerCommand(program, 'ls', 'Alias for discover')
}

function registerCommand(program: Command, name: string, description: string): void {
	program
		.command(name)
		.description(description)
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
				process.stdout.write(`${formatEntry(entry)}\n`)
			}
		})
}

function formatEntry(entry: DiscoveredEditor): string {
	const e2eValue = entry.e2e?.enabled ? `on(${entry.e2e.instanceKey})` : 'off'
	const projectValue = entry.projectPath ?? 'null'
	const appVersion = entry.appVersion ?? 'unknown'
	const logsDir = getLogsDir(entry) ?? 'unknown'

	return [
		`wsUrl=${entry.wsUrl}`,
		`wsPort=${entry.wsPort}`,
		`pid=${entry.pid}`,
		`launchDir="${entry.appLaunchDir}"`,
		`logsDir="${logsDir}"`,
		`project="${projectValue}"`,
		`appVersion=${appVersion}`,
		`startedAt=${entry.startedAt}`,
		`updatedAt=${entry.updatedAt}`,
		`instanceId=${entry.instanceId}`,
		`e2e=${e2eValue}`,
	].join(' ')
}

function getLogsDir(entry: DiscoveredEditor): string | undefined {
	if (!entry.appLaunchDir) {
		return undefined
	}

	return path.join(entry.appLaunchDir, 'logs')
}
