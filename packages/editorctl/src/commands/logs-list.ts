import type { Command } from 'commander'

import { createClient } from '@tekton/editorctl-client'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createValidationError } from '../lib/errors'
import { listRendererLogFiles } from '../lib/logs'
import { printJson } from '../lib/output'

type OutputFormat = 'text' | 'json'

export function registerLogsListCommand(program: Command): void {
	program
		.command('logs:list')
		.description('List renderer log files from the local logs directory')
		.option('--dir <path>', 'Logs directory (defaults to ./logs)')
		.option('--format <text|json>', 'Output format', 'text')
		.action(async (options: { dir?: string; format?: string }) => {
			const cwd = process.cwd()
			const logsDir = await resolveLogsDir({
				cwd,
				dirOption: options.dir,
				portOption: getPortOption(program),
				portProvided: wasPortProvided(),
			})
			await assertDirectoryExists(logsDir)

			const entries = await listRendererLogFiles(logsDir, cwd)
			if (entries.length === 0) {
				throw createValidationError('No renderer logs found in logs directory.', { logsDir })
			}

			const format = parseFormat(options.format)
			if (format === 'json') {
				printJson(
					entries.map((entry) => ({
						fileName: entry.fileName,
						runId: entry.runId,
						path: entry.absolutePath,
						relativePath: entry.relativePath,
					})),
				)
				return
			}

			const lines = entries.map((entry) => entry.relativePath ?? entry.absolutePath)
			process.stdout.write(`${lines.join('\n')}\n`)
		})
}

async function resolveLogsDir(options: { cwd: string; dirOption?: string; portOption?: number; portProvided: boolean }): Promise<string> {
	if (options.dirOption) {
		return path.resolve(options.cwd, options.dirOption)
	}

	if (!options.portProvided) {
		throw createValidationError('Missing --dir. Provide --dir when --port is not set.')
	}

	if (!options.portOption || Number.isNaN(options.portOption)) {
		throw createValidationError('Invalid --port value.', { port: options.portOption })
	}

	const editor = await resolveEditorByPort(options.portOption)
	return path.join(editor.appLaunchDir, 'logs')
}

function parseFormat(raw: string | undefined): OutputFormat {
	if (!raw || raw === 'text') {
		return 'text'
	}

	if (raw === 'json') {
		return 'json'
	}

	throw createValidationError('Invalid --format value. Use text or json.', { format: raw })
}

async function assertDirectoryExists(dirPath: string): Promise<void> {
	try {
		const stats = await stat(dirPath)
		if (!stats.isDirectory()) {
			throw createValidationError('Logs directory is not a directory.', { logsDir: dirPath })
		}
	} catch (error) {
		if (isMissingPathError(error)) {
			throw createValidationError('Logs directory does not exist.', { logsDir: dirPath })
		}
		throw error
	}
}

function isMissingPathError(error: unknown): boolean {
	return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

function wasPortProvided(argv: string[] = process.argv): boolean {
	return argv.some((arg) => arg === '--port' || arg.startsWith('--port='))
}

function getPortOption(program: Command): number | undefined {
	const opts = program.opts() as { port?: number }
	return opts?.port
}

async function resolveEditorByPort(port: number): Promise<{ appLaunchDir: string }> {
	const client = createClient({ port })
	const record = await client.ping()
	if (!record.appLaunchDir) {
		throw createValidationError('Ping response is missing appLaunchDir.', { port, instanceId: record.instanceId })
	}

	return { appLaunchDir: record.appLaunchDir }
}
