import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const RENDERER_LOG_REGEX = /^renderer-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.log$/
const SESSION_HEADER_MARKER = 'SYS : SESSION HEADER'
const SECTION_SEPARATOR = 'SYS : =================================================='
const PAGE_RELOADED_MARKER = 'SYS : PAGE RELOADED'

export type RendererLogDescriptor = {
	fileName: string
	runId: string
	mtimeMs?: number
	sizeBytes?: number
}

type RendererLogEntry = RendererLogDescriptor & {
	absolutePath: string
	sortKey: string
}

export type SessionHeader = {
	startLine: number
	endLine: number
	text: string[]
}

export type TailSection = {
	startLine: number
	endLine: number
	text: string[]
	markerLine?: number
}

export type TailTruncation = {
	originalLines: number
	keptLines: number
	reason: 'maxLines'
}

export type FetchRendererLogResult = {
	file: { fileName: string; runId: string }
	sessionHeader: SessionHeader | null
	tail: TailSection
	truncated: boolean
	truncation?: TailTruncation
}

export async function listRendererLogs(logsDir: string): Promise<RendererLogDescriptor[]> {
	const entries = await listRendererLogEntries(logsDir)
	return entries.map(toDescriptor)
}

export async function fetchRendererLog(options: {
	logsDir: string
	fileName?: string
	runId?: string
	full?: boolean
	maxLines?: number
}): Promise<FetchRendererLogResult> {
	const entries = await listRendererLogEntries(options.logsDir)
	if (entries.length === 0) {
		throw new Error('No renderer logs found in logs directory.')
	}

	const selected = selectEntry(entries, { fileName: options.fileName, runId: options.runId })
	if (!selected) {
		throw new Error('Requested renderer log file was not found.')
	}

	const content = await readFile(selected.absolutePath, 'utf8')
	const lines = splitLines(content)
	const sessionHeader = extractSessionHeader(lines)
	const tail = extractTail(lines, { full: Boolean(options.full) })
	const { tail: limitedTail, truncated, truncation } = applyTailLimits(tail, { maxLines: options.maxLines })

	return {
		file: { fileName: selected.fileName, runId: selected.runId },
		sessionHeader,
		tail: limitedTail,
		truncated,
		...(truncation ? { truncation } : {}),
	}
}

async function listRendererLogEntries(logsDir: string): Promise<RendererLogEntry[]> {
	const entries = await readdir(logsDir, { withFileTypes: true })
	const files: RendererLogEntry[] = []

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue
		}

		const parsed = parseRendererLogFileName(entry.name)
		if (!parsed) {
			continue
		}

		const absolutePath = path.join(logsDir, entry.name)
		const stats = await stat(absolutePath)
		files.push({
			absolutePath,
			fileName: entry.name,
			runId: parsed.runId,
			sortKey: parsed.sortKey,
			mtimeMs: stats.mtimeMs,
			sizeBytes: stats.size,
		})
	}

	files.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
	return files
}

function selectEntry(entries: RendererLogEntry[], selector: { fileName?: string; runId?: string }): RendererLogEntry | null {
	if (selector.fileName) {
		return entries.find((entry) => entry.fileName === selector.fileName) ?? null
	}

	if (selector.runId) {
		return entries.find((entry) => entry.runId === selector.runId) ?? null
	}

	return entries[0] ?? null
}

function toDescriptor(entry: RendererLogEntry): RendererLogDescriptor {
	return {
		fileName: entry.fileName,
		runId: entry.runId,
		mtimeMs: entry.mtimeMs,
		sizeBytes: entry.sizeBytes,
	}
}

function parseRendererLogFileName(fileName: string): { runId: string; sortKey: string } | null {
	const match = RENDERER_LOG_REGEX.exec(fileName)
	if (!match) {
		return null
	}

	const runId = match[1]
	const sortKey = runId.replace(/[-T]/g, '')
	return { runId, sortKey }
}

function splitLines(text: string): string[] {
	const lines = text.split(/\r?\n/)
	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop()
	}
	return lines
}

function extractSessionHeader(lines: string[]): SessionHeader | null {
	const headerIndex = lines.findIndex((line) => line.includes(SESSION_HEADER_MARKER))
	if (headerIndex === -1) {
		return null
	}

	let startIndex = headerIndex
	for (let i = headerIndex; i >= 0; i -= 1) {
		if (lines[i].includes(SECTION_SEPARATOR)) {
			startIndex = i
			break
		}
	}

	let endIndex = headerIndex
	for (let i = headerIndex; i < lines.length; i += 1) {
		if (lines[i].includes(SECTION_SEPARATOR)) {
			endIndex = i
			if (i >= headerIndex) {
				break
			}
		}
	}

	const text = lines.slice(startIndex, endIndex + 1)
	return { startLine: startIndex + 1, endLine: endIndex + 1, text }
}

function extractTail(lines: string[], options: { full: boolean }): TailSection {
	if (lines.length === 0) {
		return { startLine: 1, endLine: 0, text: [] }
	}

	if (options.full) {
		return { startLine: 1, endLine: lines.length, text: lines }
	}

	let markerIndex = -1
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		if (lines[i].includes(PAGE_RELOADED_MARKER)) {
			markerIndex = i
			break
		}
	}

	const startIndex = markerIndex === -1 ? 0 : markerIndex + 1
	const text = lines.slice(startIndex)
	const tail: TailSection = {
		startLine: startIndex + 1,
		endLine: lines.length,
		text,
	}

	if (markerIndex !== -1) {
		tail.markerLine = markerIndex + 1
	}

	return tail
}

function applyTailLimits(
	tail: TailSection,
	options: { maxLines?: number },
): { tail: TailSection; truncated: boolean; truncation?: TailTruncation } {
	if (!options.maxLines || options.maxLines <= 0) {
		return { tail, truncated: false }
	}

	if (tail.text.length <= options.maxLines) {
		return { tail: { ...tail }, truncated: false }
	}

	const keptLines = tail.text.slice(tail.text.length - options.maxLines)
	const newStartLine = tail.endLine - options.maxLines + 1
	const truncatedTail: TailSection = {
		...tail,
		startLine: Math.max(1, newStartLine),
		text: keptLines,
	}

	const truncation: TailTruncation = {
		originalLines: tail.text.length,
		keptLines: options.maxLines,
		reason: 'maxLines',
	}

	return { tail: truncatedTail, truncated: true, truncation }
}
