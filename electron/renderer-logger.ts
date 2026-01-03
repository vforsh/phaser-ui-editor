import { app, WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Options for the renderer console file logger.
 */
interface LoggerOptions {
	/** Directory where log files will be stored. */
	logsDir: string
	/** Unique identifier for the current run, used in the log filename. */
	runId: string
	/** Maximum size of a single log file in bytes before rotation. Defaults to 1MB. */
	maxBytes?: number
	/** Maximum number of rotated log files to keep. Defaults to 10. */
	maxFiles?: number
}

/**
 * Captures renderer console messages and writes them to a log file.
 * Only active in development mode.
 */
export function createRendererConsoleFileLogger({
	logsDir,
	runId,
	maxBytes = 1 * 1024 * 1024, // 1MB
	maxFiles = 10,
}: LoggerOptions) {
	if (app.isPackaged) {
		return {
			attachToWebContents: () => {},
			dispose: async () => {},
		}
	}

	const logFilePath = path.join(logsDir, `renderer-${runId}.log`)
	let currentBytes = 0
	let writeStream: fs.WriteStream | null = null
	let writePromise = Promise.resolve()

	const ensureDir = () => {
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true })
		}
	}

	const getStream = () => {
		if (!writeStream) {
			ensureDir()
			writeStream = fs.createWriteStream(logFilePath, { flags: 'a' })
			if (fs.existsSync(logFilePath)) {
				currentBytes = fs.statSync(logFilePath).size
			} else {
				currentBytes = 0
			}
		}
		return writeStream
	}

	const rotate = async () => {
		if (writeStream) {
			await new Promise<void>((resolve) => writeStream!.end(resolve))
			writeStream = null
		}

		// Shift existing files: .9 -> .10, .8 -> .9, ..., .1 -> .2
		for (let i = maxFiles - 1; i >= 1; i--) {
			const oldPath = `${logFilePath}.${i}`
			const newPath = `${logFilePath}.${i + 1}`
			if (fs.existsSync(oldPath)) {
				if (i + 1 > maxFiles) {
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
		if (fs.existsSync(logFilePath)) {
			try {
				fs.renameSync(logFilePath, `${logFilePath}.1`)
			} catch (e) {
				// ignore
			}
		}

		currentBytes = 0
	}

	const logLine = (line: string) => {
		writePromise = writePromise
			.then(async () => {
				const lineBuffer = Buffer.from(line)
				if (currentBytes + lineBuffer.length > maxBytes) {
					await rotate()
				}

				const stream = getStream()
				return new Promise<void>((resolve, reject) => {
					stream.write(lineBuffer, (err) => {
						if (err) {
							reject(err)
						} else {
							currentBytes += lineBuffer.length
							resolve()
						}
					})
				})
			})
			.catch((err) => {
				console.error('[renderer-logger] Error writing to log file:', err)
			})
	}

	/** 4 letter level codes */
	const levelMap: Record<string, string> = {
		log: 'LOG ',
		info: 'INFO',
		warning: 'WARN',
		warn: 'WARN',
		error: 'ERR ',
		debug: 'DEBG',
	}

	const handleConsoleMessage = (event: Electron.Event<Electron.WebContentsConsoleMessageEventParams>) => {
		const levelRaw = String(event.level ?? 'log').toLowerCase()
		const levelName = levelMap[levelRaw] || 'LOG '
		const message = String(event.message ?? '')

		const timestamp = new Date().toISOString()
		const line = `${timestamp} ${levelName}: ${message}\n`
		logLine(line)
	}

	const handleDidNavigate = (_event: Electron.Event, url: string) => {
		const timestamp = new Date().toISOString()
		const separator = '='.repeat(50)
		const line = `\n${timestamp} SYS : ${separator}\n${timestamp} SYS : PAGE RELOADED: ${url}\n${timestamp} SYS : ${separator}\n\n`
		logLine(line)
	}

	return {
		attachToWebContents: (webContents: WebContents) => {
			webContents.on('console-message', handleConsoleMessage)
			webContents.on('did-navigate', handleDidNavigate)
		},
		dispose: async () => {
			await writePromise
			if (writeStream) {
				await new Promise<void>((resolve) => writeStream!.end(resolve))
				writeStream = null
			}
		},
	}
}
