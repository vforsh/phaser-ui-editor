import { app, WebContents } from 'electron'
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
}

const LEVEL_MAP: Record<string, string> = {
	log: 'LOG ',
	info: 'INFO',
	warning: 'WARN',
	warn: 'WARN',
	error: 'ERR ',
	debug: 'DEBG',
}

/**
 * Captures renderer console messages and writes them to a log file.
 * Only active in development mode.
 */
export class RendererFileLogger {
	private readonly logsDir: string
	private readonly runId: string
	private readonly maxBytes: number
	private readonly maxFiles: number
	private readonly logFilePath: string
	private currentBytes = 0
	private writeStream: fs.WriteStream | null = null
	private writePromise = Promise.resolve()

	constructor(options: LoggerOptions) {
		this.logsDir = options.logsDir
		this.runId = options.runId
		this.maxBytes = options.maxBytes ?? 1 * 1024 * 1024
		this.maxFiles = options.maxFiles ?? 10
		this.logFilePath = path.join(this.logsDir, `renderer-${this.runId}.log`)
	}

	/**
	 * Attaches the logger to the specified WebContents.
	 */
	public attachToWebContents(webContents: WebContents): void {
		webContents.on('console-message', this.handleConsoleMessage)
		webContents.on('did-navigate', this.handleDidNavigate)
	}

	private ensureDir(): void {
		if (!fs.existsSync(this.logsDir)) {
			fs.mkdirSync(this.logsDir, { recursive: true })
		}
	}

	private getStream(): fs.WriteStream {
		if (!this.writeStream) {
			this.ensureDir()
			this.writeStream = fs.createWriteStream(this.logFilePath, { flags: 'a' })
			if (fs.existsSync(this.logFilePath)) {
				this.currentBytes = fs.statSync(this.logFilePath).size
			} else {
				this.currentBytes = 0
			}
		}
		return this.writeStream
	}

	private async rotate(): Promise<void> {
		if (this.writeStream) {
			await new Promise<void>((resolve) => this.writeStream!.end(resolve))
			this.writeStream = null
		}

		// Shift existing files: .9 -> .10, .8 -> .9, ..., .1 -> .2
		for (let i = this.maxFiles - 1; i >= 1; i--) {
			const oldPath = `${this.logFilePath}.${i}`
			const newPath = `${this.logFilePath}.${i + 1}`
			if (fs.existsSync(oldPath)) {
				if (i + 1 > this.maxFiles) {
					try {
						fs.unlinkSync(oldPath)
					} catch (e) {
						// ignore
					}
				} else {
					try {
						fs.renameSync(oldPath, newPath)
					} catch (e) {
						// ignore
					}
				}
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
