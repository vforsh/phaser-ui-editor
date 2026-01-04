import { app, type IpcMain, WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Options for the renderer console file logger.
 */
export interface LoggerOptions {
	/** Directory where log files will be stored. */
	logsDir: string
	/** Unique identifier for the current run, used in the log filename. */
	runId: string
	/** Maximum size of a single log file in bytes before rotation. Defaults to 1MB. */
	maxBytes?: number
	/** Maximum number of rotated log files to keep. Defaults to 10. */
	maxFiles?: number
	/** Maximum number of renderer run logs to keep in the logs directory. Defaults to 10. */
	maxRuns?: number
}

const LEVEL_MAP: Record<string, string> = {
	log: 'LOG ',
	info: 'INFO',
	warning: 'WARN',
	warn: 'WARN',
	error: 'ERR ',
	debug: 'DEBG',
}

export type RendererErrorStackLogEntry = {
	/**
	 * Source/kind of the captured error (e.g. `window.error`, `window.unhandledrejection`, `console.error`).
	 */
	kind: string
	/**
	 * Human-readable error message (usually includes the exception name).
	 */
	message: string
	/**
	 * Raw stack trace, if available.
	 */
	stack?: string
}

/**
 * Captures renderer console messages and writes them to a log file.
 * Only active in development mode.
 */
export class RendererFileLogger {
	private readonly logsDir: string
	private readonly runId: string
	private readonly startedAtIso: string
	private readonly maxBytes: number
	private readonly maxFiles: number
	private readonly maxRuns: number
	private readonly logFilePath: string
	private currentBytes = 0
	private writeStream: fs.WriteStream | null = null
	private writePromise = Promise.resolve()
	private didPruneOldRuns = false
	private didWriteSessionHeader = false

	constructor(options: LoggerOptions) {
		this.logsDir = options.logsDir
		this.runId = options.runId
		this.startedAtIso = new Date().toISOString()
		this.maxBytes = options.maxBytes ?? 1 * 1024 * 1024
		this.maxFiles = options.maxFiles ?? 10
		this.maxRuns = options.maxRuns ?? 10
		this.logFilePath = path.join(this.logsDir, `renderer-${this.runId}.log`)

		// Best-effort pruning of old run logs; keep logs/ from growing without bound in dev.
		this.pruneOldRunLogsOnce()
	}

	/**
	 * Attaches the logger to the specified WebContents.
	 */
	public attachToWebContents(webContents: WebContents): void {
		webContents.on('console-message', this.handleConsoleMessage)
		webContents.on('did-navigate', this.handleDidNavigate)
	}

	/**
	 * Registers an IPC listener that accepts renderer-forwarded error stacks and writes them into
	 * the same per-run renderer log file.
	 */
	public attachErrorStackIpc(ipcMain: IpcMain, channel: string): void {
		ipcMain.removeAllListeners(channel)
		ipcMain.on(channel, (_event, payload: unknown) => {
			if (!payload || typeof payload !== 'object') {
				return
			}

			const kind = (payload as { kind?: unknown }).kind
			const message = (payload as { message?: unknown }).message
			const stack = (payload as { stack?: unknown }).stack

			if (typeof kind !== 'string' || typeof message !== 'string') {
				return
			}

			this.logRendererErrorWithStack({
				kind,
				message,
				stack: typeof stack === 'string' ? stack : undefined,
			})
		})
	}

	/**
	 * Writes additional renderer-originated log lines (e.g. uncaught errors with stack traces)
	 * into the same per-run renderer log file.
	 *
	 * NOTE: Electron's `console-message` event only provides a string and frequently drops stack traces,
	 * so this is intended to supplement it via IPC from preload.
	 *
	 * @param input - Captured error payload forwarded from the renderer main world.
	 */
	public logRendererErrorWithStack(input: RendererErrorStackLogEntry): void {
		const timestamp = new Date().toISOString()
		const header = `[${input.kind}] ${input.message}`
		this.logLine(`${timestamp} ERR : ${header}\n`)

		const stack = input.stack?.trim()
		if (!stack) {
			return
		}

		for (const rawLine of stack.split('\n')) {
			const line = rawLine.trimEnd()
			if (!line) {
				continue
			}
			this.logLine(`${timestamp} ERR : ${line}\n`)
		}
	}

	private ensureDir(): void {
		if (!fs.existsSync(this.logsDir)) {
			fs.mkdirSync(this.logsDir, { recursive: true })
		}
	}

	private getStream(): fs.WriteStream {
		if (!this.writeStream) {
			this.ensureDir()
			this.pruneOldRunLogsOnce()
			this.writeStream = fs.createWriteStream(this.logFilePath, { flags: 'a' })
			if (fs.existsSync(this.logFilePath)) {
				this.currentBytes = fs.statSync(this.logFilePath).size
			} else {
				this.currentBytes = 0
			}

			this.writeSessionHeaderIfNeeded(this.writeStream)
		}
		return this.writeStream
	}

	private writeSessionHeaderIfNeeded(stream: fs.WriteStream): void {
		if (this.didWriteSessionHeader) {
			return
		}

		// "Once per file": if we're appending to an existing file, don't duplicate the header.
		if (this.currentBytes > 0) {
			this.didWriteSessionHeader = true
			return
		}

		const timestamp = new Date().toISOString()
		const separator = '='.repeat(50)

		const versions = Object.entries(process.versions ?? {})
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${timestamp} SYS : versions.${k}: ${String(v)}\n`)
			.join('')

		const headerLines =
			`${timestamp} SYS : ${separator}\n` +
			`${timestamp} SYS : SESSION HEADER\n` +
			`${timestamp} SYS : runId: ${this.runId}\n` +
			`${timestamp} SYS : startedAt: ${this.startedAtIso}\n` +
			`${timestamp} SYS : appVersion: ${app.getVersion()}\n` +
			`${timestamp} SYS : isPackaged: ${String(app.isPackaged)}\n` +
			`${timestamp} SYS : platform: ${process.platform}\n` +
			`${timestamp} SYS : arch: ${process.arch}\n` +
			`${timestamp} SYS : pid: ${String(process.pid)}\n` +
			`${timestamp} SYS : cwd: ${process.cwd()}\n` +
			`${timestamp} SYS : env.NODE_ENV: ${process.env.NODE_ENV ?? '(unset)'}\n` +
			`${timestamp} SYS : env.PW_E2E: ${process.env.PW_E2E ?? '(unset)'}\n` +
			versions +
			`${timestamp} SYS : ${separator}\n`

		try {
			const buf = Buffer.from(headerLines)
			stream.write(buf)
			this.currentBytes += buf.length
		} catch {
			// ignore
		} finally {
			this.didWriteSessionHeader = true
		}
	}

	private pruneOldRunLogsOnce(): void {
		if (this.didPruneOldRuns) {
			return
		}
		this.didPruneOldRuns = true

		if (app.isPackaged) {
			return
		}

		this.ensureDir()

		const maxRuns = this.maxRuns
		if (maxRuns <= 0) {
			return
		}

		let dirEntries: fs.Dirent[]
		try {
			dirEntries = fs.readdirSync(this.logsDir, { withFileTypes: true })
		} catch {
			return
		}

		const rendererLogMatch = /^renderer-(.+?)\.log(?:\.(\d+))?$/
		const groups = new Map<
			string,
			{
				newestMtimeMs: number
				fileNames: string[]
			}
		>()

		for (const entry of dirEntries) {
			if (!entry.isFile()) {
				continue
			}

			const match = rendererLogMatch.exec(entry.name)
			if (!match) {
				continue
			}

			const baseName = `renderer-${match[1]}.log`
			const fullPath = path.join(this.logsDir, entry.name)

			let mtimeMs = 0
			try {
				mtimeMs = fs.statSync(fullPath).mtimeMs
			} catch {
				// ignore
			}

			const group = groups.get(baseName)
			if (!group) {
				groups.set(baseName, { newestMtimeMs: mtimeMs, fileNames: [entry.name] })
				continue
			}

			group.fileNames.push(entry.name)
			group.newestMtimeMs = Math.max(group.newestMtimeMs, mtimeMs)
		}

		const sortedGroups = [...groups.entries()].sort((a, b) => b[1].newestMtimeMs - a[1].newestMtimeMs)
		const groupsToDelete = sortedGroups.slice(maxRuns)

		for (const [, group] of groupsToDelete) {
			for (const fileName of group.fileNames) {
				const fullPath = path.join(this.logsDir, fileName)
				try {
					fs.unlinkSync(fullPath)
				} catch {
					// ignore
				}
			}
		}
	}

	private async rotate(): Promise<void> {
		if (this.writeStream) {
			await new Promise<void>((resolve) => this.writeStream!.end(resolve))
			this.writeStream = null
		}

		// Next `getStream()` call will create a fresh file; allow writing the session header again.
		this.didWriteSessionHeader = false

		// Ensure the oldest rotated file is removed so we never exceed maxFiles.
		const oldestPath = `${this.logFilePath}.${this.maxFiles}`
		if (fs.existsSync(oldestPath)) {
			try {
				fs.unlinkSync(oldestPath)
			} catch {
				// ignore
			}
		}

		// Shift existing files: .9 -> .10, .8 -> .9, ..., .1 -> .2
		for (let i = this.maxFiles - 1; i >= 1; i--) {
			const oldPath = `${this.logFilePath}.${i}`
			const newPath = `${this.logFilePath}.${i + 1}`
			if (!fs.existsSync(oldPath)) {
				continue
			}
			try {
				fs.renameSync(oldPath, newPath)
			} catch {
				// ignore
			}
		}

		// Rename current log to .1
		if (fs.existsSync(this.logFilePath)) {
			try {
				fs.renameSync(this.logFilePath, `${this.logFilePath}.1`)
			} catch (e) {
				// ignore
			}
		}

		this.currentBytes = 0
	}

	private logLine(line: string): void {
		this.writePromise = this.writePromise
			.then(async () => {
				const lineBuffer = Buffer.from(line)
				if (this.currentBytes + lineBuffer.length > this.maxBytes) {
					await this.rotate()
				}

				const stream = this.getStream()
				return new Promise<void>((resolve, reject) => {
					stream.write(lineBuffer, (err) => {
						if (err) {
							reject(err)
						} else {
							this.currentBytes += lineBuffer.length
							resolve()
						}
					})
				})
			})
			.catch((err) => {
				console.error('[renderer-logger] Error writing to log file:', err)
			})
	}

	private handleConsoleMessage = (event: Electron.Event<Electron.WebContentsConsoleMessageEventParams>) => {
		const levelRaw = String(event.level ?? 'log').toLowerCase()
		const levelName = LEVEL_MAP[levelRaw] || 'LOG '
		const message = String(event.message ?? '')

		const timestamp = new Date().toISOString()
		const line = `${timestamp} ${levelName}: ${message}\n`
		this.logLine(line)
	}

	private handleDidNavigate = (_event: Electron.Event, url: string) => {
		const timestamp = new Date().toISOString()
		const separator = '='.repeat(50)
		const line = `\n${timestamp} SYS : ${separator}\n${timestamp} SYS : PAGE RELOADED: ${url}\n${timestamp} SYS : ${separator}\n\n`
		this.logLine(line)
	}

	/**
	 * Disposes of the logger, closing the write stream.
	 */
	public async dispose(): Promise<void> {
		if (app.isPackaged) {
			return
		}
		await this.writePromise
		if (this.writeStream) {
			await new Promise<void>((resolve) => this.writeStream!.end(resolve))
			this.writeStream = null
		}
	}
}
