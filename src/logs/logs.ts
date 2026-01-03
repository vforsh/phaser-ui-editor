import { LogLevel, LogsManager } from './LogsManager'

const defaultMinLogLevel = LogLevel.INFO

function getInitialMinLogLevel(): LogLevel {
	if (typeof window === 'undefined') {
		return defaultMinLogLevel
	}

	try {
		const storedState = window.localStorage?.getItem('state')
		if (!storedState) {
			return defaultMinLogLevel
		}

		const parsed = JSON.parse(storedState) as { settings?: { dev?: { minLogLevel?: unknown } } }
		const candidate = parsed?.settings?.dev?.minLogLevel

		if (typeof candidate === 'number' && LogLevel[candidate] !== undefined) {
			return candidate as LogLevel
		}
	} catch (error) {
		console.warn('Failed to read stored log level, falling back to INFO', error)
	}

	return defaultMinLogLevel
}

export const logger = new LogsManager({ rootLoggerName: 'app', minLogLevel: getInitialMinLogLevel() })
