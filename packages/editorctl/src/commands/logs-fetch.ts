import type { Command } from 'commander'

import { createClient } from '@tekton/editorctl-client'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createValidationError } from '../lib/errors'
import {
	applyTailLimits,
	extractSessionHeader,
	extractTail,
	listRendererLogFiles,
	parseRendererLogFileName,
	splitLines,
	type SessionHeader,
	type TailSection,
} from '../lib/logs'
import { printJson } from '../lib/output'

type OutputFormat = 'text' | 'json'

type FetchOptions = {
	file?: string
	dir?: string
	format?: string
	full?: boolean
	maxLines?: number
}

export function registerLogsFetchCommand(program: Command): void {
	program
		.command('logs:fetch')
		.description('Fetch renderer log output (prefers control RPC when --port is set)')
		.option('--file <path>', 'Log file path (defaults to latest renderer log)')
		.option('--dir <path>', 'Logs directory (required when --port is not set)')
		.option('--format <text|json>', 'Output format', 'text')
		.option('--full', 'Print full log file (ignore PAGE RELOADED markers)', false)
		.option('--max-lines <number>', 'Limit tail to last N lines', (value) => Number.parseInt(value, 10))
		.action(async (options: FetchOptions) => {
			const cwd = process.cwd()
			const format = parseFormat(options.format)
			const maxLines = parseMaxLines(options.maxLines)
			const portProvided = wasPortProvided()
			const portOption = getPortOption(program)

			const localOverride = Boolean(options.dir) || isPathLike(options.file)
			if (localOverride) {
				const fileInfo = options.file
					? await resolveExplicitFile(options.file, cwd)
					: await resolveLatestFile({
							cwd,
							dirOption: options.dir,
							portOption,
							portProvided,
						})

				const content = await readFile(fileInfo.absolutePath, 'utf8')
				const lines = splitLines(content)
				const sessionHeader = extractSessionHeader(lines)
				const tail = extractTail(lines, { full: Boolean(options.full) })
				const { tail: limitedTail, truncated, truncation } = applyTailLimits(tail, { maxLines })

				if (format === 'json') {
					printJson({
						file: {
							fileName: fileInfo.fileName,
							path: fileInfo.absolutePath,
							relativePath: fileInfo.relativePath,
							runId: fileInfo.runId ?? null,
						},
						sessionHeader: sessionHeader ? { ...sessionHeader } : null,
						tail: { ...limitedTail },
						truncated,
						...(truncation ? { truncation } : {}),
					})
					return
				}

				const output = formatTextOutput({
					full: Boolean(options.full),
					tail: limitedTail,
					sessionHeader,
				})
				process.stdout.write(`${output}\n`)
				return
			}

			if (!portProvided) {
				throw createValidationError('Missing --dir. Provide --dir when --port is not set.')
			}

			if (!portOption || Number.isNaN(portOption)) {
				throw createValidationError('Invalid --port value.', { port: portOption })
			}

			const client = createClient({ port: portOption })
			const fileSelector = parseRpcFileSelector(options.file)
			const result = await client.call('fetchRendererLog', {
				...fileSelector,
				full: options.full,
				maxLines,
			})

			if (format === 'json') {
				printJson(result)
				return
			}

			const output = formatTextOutput({
				full: Boolean(options.full),
				tail: result.tail,
				sessionHeader: result.sessionHeader,
			})
			process.stdout.write(`${output}\n`)
		})
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

function parseMaxLines(raw: number | undefined): number | undefined {
	if (raw === undefined) {
		return undefined
	}

	if (!Number.isFinite(raw) || raw <= 0) {
		throw createValidationError('Invalid --max-lines value. Use a positive integer.', { maxLines: raw })
	}

	return Math.trunc(raw)
}

const RUN_ID_REGEX = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}$/
const FILE_NAME_REGEX = /^renderer-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.log$/

function parseRpcFileSelector(fileOption?: string): { fileName?: string; runId?: string } {
	if (!fileOption) {
		return {}
	}

	if (FILE_NAME_REGEX.test(fileOption)) {
		return { fileName: fileOption }
	}

	if (RUN_ID_REGEX.test(fileOption)) {
		return { runId: fileOption }
	}

	throw createValidationError('Invalid --file value for RPC mode. Use a renderer log filename or run id.', {
		file: fileOption,
	})
}

function isPathLike(fileOption?: string): boolean {
	if (!fileOption) {
		return false
	}

	if (path.isAbsolute(fileOption)) {
		return true
	}

	return fileOption.includes(path.sep)
}

async function resolveLatestFile(options: {
	cwd: string
	dirOption?: string
	portOption?: number
	portProvided: boolean
}): Promise<ResolvedLogFile> {
	const logsDir = await resolveLogsDir(options)
	await assertDirectoryExists(logsDir)
	const entries = await listRendererLogFiles(logsDir, options.cwd)
	if (entries.length === 0) {
		throw createValidationError('No renderer logs found in logs directory.', { logsDir })
	}

	const latest = entries[0]
	return {
		absolutePath: latest.absolutePath,
		fileName: latest.fileName,
		relativePath: latest.relativePath,
		runId: latest.runId,
	}
}

async function resolveExplicitFile(fileOption: string, cwd: string): Promise<ResolvedLogFile> {
	const absolutePath = path.isAbsolute(fileOption) ? fileOption : path.resolve(cwd, fileOption)
	await assertFileExists(absolutePath)
	const fileName = path.basename(absolutePath)
	const parsed = parseRendererLogFileName(fileName)
	return {
		absolutePath,
		fileName,
		relativePath: toRelativePath(absolutePath, cwd),
		runId: parsed?.runId,
	}
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

function formatTextOutput(options: { full: boolean; tail: TailSection; sessionHeader: SessionHeader | null }): string {
	if (options.full || options.tail.startLine === 1) {
		return options.tail.text
	}

	if (options.sessionHeader) {
		return `${options.sessionHeader.text}\n\n${options.tail.text}`
	}

	return options.tail.text
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

async function assertFileExists(filePath: string): Promise<void> {
	try {
		const stats = await stat(filePath)
		if (!stats.isFile()) {
			throw createValidationError('Log file path is not a file.', { filePath })
		}
	} catch (error) {
		if (isMissingPathError(error)) {
			throw createValidationError('Log file does not exist.', { filePath })
		}
		throw error
	}
}

function isMissingPathError(error: unknown): boolean {
	return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

function toRelativePath(absolutePath: string, cwd: string): string | undefined {
	const relativePath = path.relative(cwd, absolutePath)
	if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		return undefined
	}

	return relativePath
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

type ResolvedLogFile = {
	absolutePath: string
	fileName: string
	relativePath?: string
	runId?: string
}
