import { readdir } from 'node:fs/promises'
import path from 'node:path'

const RENDERER_LOG_REGEX = /^renderer-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.log$/
const SESSION_HEADER_MARKER = 'SYS : SESSION HEADER'
const SECTION_SEPARATOR = 'SYS : =================================================='
const PAGE_RELOADED_MARKER = 'SYS : PAGE RELOADED'

export type RendererLogFile = {
	absolutePath: string
	fileName: string
	runId: string
	sortKey: string
	relativePath?: string
}

export type SessionHeader = {
	startLine: number
	endLine: number
	text: string
}

export type TailSection = {
	startLine: number
	endLine: number
	text: string
	markerLine?: number
}

export type TailTruncation = {
	originalLines: number
	keptLines: number
	reason: 'maxLines'
}

export function splitLines(text: string): string[] {
	const lines = text.split(/\r?\n/)
	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop()
	}
	return lines
}

export function parseRendererLogFileName(fileName: string): { runId: string; sortKey: string } | null {
	const match = RENDERER_LOG_REGEX.exec(fileName)
	if (!match) {
		return null
	}

	const runId = match[1]
	const sortKey = runId.replace(/[-T]/g, '')
	return { runId, sortKey }
}

export async function listRendererLogFiles(logsDir: string, cwd: string): Promise<RendererLogFile[]> {
	const entries = await readdir(logsDir, { withFileTypes: true })
	const files: RendererLogFile[] = []

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue
		}

		const parsed = parseRendererLogFileName(entry.name)
		if (!parsed) {
			continue
		}

		const absolutePath = path.join(logsDir, entry.name)
		const relativePath = toRelativePath(absolutePath, cwd)
		files.push({
			absolutePath,
			fileName: entry.name,
			runId: parsed.runId,
			sortKey: parsed.sortKey,
			relativePath,
		})
	}

	files.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
	return files
}

export function extractSessionHeader(lines: string[]): SessionHeader | null {
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

	const text = lines.slice(startIndex, endIndex + 1).join('\n')
	return { startLine: startIndex + 1, endLine: endIndex + 1, text }
}

export function extractTail(lines: string[], options: { full: boolean }): TailSection {
	if (lines.length === 0) {
		return { startLine: 1, endLine: 0, text: '' }
	}

	if (options.full) {
		return { startLine: 1, endLine: lines.length, text: lines.join('\n') }
	}

	let markerIndex = -1
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		if (lines[i].includes(PAGE_RELOADED_MARKER)) {
			markerIndex = i
			break
		}
	}

	const startIndex = markerIndex === -1 ? 0 : markerIndex + 1
	const text = lines.slice(startIndex).join('\n')
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

export function applyTailLimits(
	tail: TailSection,
	options: { maxLines?: number },
): { tail: TailSection; truncated: boolean; truncation?: TailTruncation } {
	if (!options.maxLines || options.maxLines <= 0) {
		return { tail, truncated: false }
	}

	const lines = splitLines(tail.text)
	if (lines.length <= options.maxLines) {
		return { tail: { ...tail }, truncated: false }
	}

	const keptLines = lines.slice(lines.length - options.maxLines)
	const newStartLine = tail.endLine - options.maxLines + 1
	const truncatedTail: TailSection = {
		...tail,
		startLine: Math.max(1, newStartLine),
		text: keptLines.join('\n'),
	}

	const truncation: TailTruncation = {
		originalLines: lines.length,
		keptLines: options.maxLines,
		reason: 'maxLines',
	}

	return { tail: truncatedTail, truncated: true, truncation }
}

function toRelativePath(absolutePath: string, cwd: string): string | undefined {
	const relativePath = path.relative(cwd, absolutePath)
	if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		return undefined
	}

	return relativePath
}
