import { ILogObj, IMeta, ISettings, ISettingsParam, Logger } from 'tslog'
import { assertNever } from '../components/canvas/phaser/robowhale/utils/assert-never'
import { LogChannel } from './LogChannel'
export enum LogLevel {
	SILLY,
	TRACE,
	DEBUG,
	INFO,
	WARN,
	ERROR,
	FATAL,
}

export interface ILogObjMeta {
	messages: unknown[]
	_meta: IMeta
}

export type LogObj = ILogObj

export interface LogsManagerOptions {
	rootLoggerName: string
	minLogLevel?: LogLevel
}

export class LogsManager {
	private settings: LogsManagerOptions
	private loggers: Map<string, Logger<LogObj>>
	private logger: Logger<LogObj>

	constructor(settings: LogsManagerOptions) {
		this.settings = settings

		this.loggers = new Map<string, Logger<LogObj>>()

		this.logger = new Logger<LogObj>({
			name: this.settings.rootLoggerName,
			minLevel: this.settings.minLogLevel ?? LogLevel.INFO,
			hideLogPositionForProduction: true,
			prettyLogTemplate: '{{logLevelName}}#[{{hh}}:{{MM}}:{{ss}}.{{ms}}] [{{name}}]',
			prettyErrorParentNamesSeparator: '',
			prettyLogTimeZone: 'local',
			argumentsArrayName: 'messages',
			stylePrettyLogs: false,
			overwrite: {
				// @ts-expect-error
				transportFormatted: this.logToBrowserConsole.bind(this),
			},
		})

		// this.logger.attachTransport(this.postProcess.bind(this));
	}

	private logToBrowserConsole(
		logMetaMarkup: string,
		logArgs: unknown[],
		logErrors: string[],
		settings: ISettings<unknown>
	): void {
		settings.prettyInspectOptions.colors = settings.stylePrettyLogs

		const logLevel = this.getLogLevelFromMetaMarkup(logMetaMarkup)
		const meta = logMetaMarkup.slice(logMetaMarkup.indexOf('#') + 1)

		this.getConsoleMethod(logLevel).call(console, meta, ...logArgs, ...logErrors)
	}

	private getLogLevelFromMetaMarkup(markup: string): LogLevel {
		const logLevelStr = markup.slice(0, markup.indexOf('#'))
		const withoutColors = logLevelStr.replace(
			// eslint-disable-next-line
			/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
			''
		)

		// @ts-expect-error
		return LogLevel[withoutColors]
	}

	private getConsoleMethod(level: LogLevel) {
		switch (level) {
			case LogLevel.SILLY:
			case LogLevel.TRACE:
			case LogLevel.DEBUG:
			case LogLevel.INFO:
				return console.log
			case LogLevel.WARN:
				return console.warn
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				return console.error

			default:
				assertNever(level, 'Unknown log level!')
		}
	}

	private postProcess(logObj: ILogObjMeta): void {}

	public info(...args: unknown[]): void {
		this.logger.info(...args)
	}

	public warn(...args: unknown[]): void {
		this.logger.warn(...args)
	}

	public error(...args: unknown[]): void {
		this.logger.error(...args)
	}

	public getOrCreate(
		channel: LogChannel,
		settings?: Omit<ISettingsParam<LogObj>, 'name'>,
		logObj?: LogObj
	): Logger<LogObj> {
		return this.getLogger(channel) ?? this.createLogger(channel, settings, logObj)
	}

	public createLogger(channel: LogChannel, settings?: Omit<ISettingsParam<LogObj>, 'name'>, logObj?: LogObj) {
		if (this.loggers.has(channel)) {
			throw new Error(`Logger '${channel}' already exists!`)
		}

		const sublogger = this.logger.getSubLogger({ name: channel, ...settings }, logObj)
		sublogger.settings.parentNames = []
		this.loggers.set(channel, sublogger)

		return sublogger
	}

	public getLogger(channel: LogChannel): Logger<LogObj> | undefined {
		return this.loggers.get(channel)
	}

	public removeLogger(channel: LogChannel): void {
		if (!this.loggers.has(channel)) {
			this.warn(`Logger '${channel}' doesn't exist!`)
			return
		}

		this.loggers.delete(channel)
	}

	public setMinLogLevel(level: LogLevel): void {
		this.settings.minLogLevel = level
		this.logger.settings.minLevel = level

		this.loggers.forEach((logger) => {
			logger.settings.minLevel = level
		})
	}

	public get enabled(): boolean {
		return this.logger.settings.type !== 'hidden'
	}

	public set enabled(value: boolean) {
		this.logger.settings.type = value ? 'pretty' : 'hidden'
	}
}
