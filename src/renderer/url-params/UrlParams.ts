import { ILogObj, Logger } from 'tslog'

export const URL_PARAM_GROUPS = {
	general: 'General',
	layout: 'Layout',
	project: 'Project',
	debug: 'Debug',
	testing: 'Testing',
} as const

export type UrlParamGroup = keyof typeof URL_PARAM_GROUPS

export interface UrlParamDefinition {
	name: string
	description: string
	group?: UrlParamGroup
}

export const URL_PARAMS = [
	{
		name: 'zoom',
		description: 'Canvas zoom override (example: `zoom=1.5`).',
		group: 'general',
	},
	{
		name: 'stateDevTools',
		description: 'Enables state devtools (example: `stateDevTools=1`).',
		group: 'debug',
	},
	{
		name: 'hierarchy',
		description: 'Initial hierarchy panel visibility (example: `hierarchy=1`).',
		group: 'layout',
	},
	{
		name: 'assets',
		description: 'Initial assets panel visibility (example: `assets=1`).',
		group: 'layout',
	},
	{
		name: 'inspector',
		description: 'Initial inspector panel visibility (example: `inspector=1`).',
		group: 'layout',
	},
	{
		name: 'projectPath',
		description: 'Absolute path to project dir to auto-open (example: `projectPath=/Users/...`).',
		group: 'project',
	},
	{
		name: 'clearConsole',
		description: 'Clears console in specific scopes (example: `clearConsole=scene`).',
		group: 'debug',
	},
	{
		name: 'test',
		description: 'Start with TestScene (example: `test=1`).',
		group: 'testing',
	},
	{
		name: 'scan',
		description: 'Enable react-scan (example: `scan=1`).',
		group: 'debug',
	},
	{
		name: 'e2e',
		description: 'E2E mode (example: `e2e=1`).',
		group: 'testing',
	},
] as const satisfies readonly UrlParamDefinition[]

export type UrlParam = (typeof URL_PARAMS)[number]['name']

export class UrlParams {
	private static logger?: Logger<ILogObj>
	private static usp?: URLSearchParams & { originalSearch?: string }

	public static configure(options: { logger: Logger<ILogObj> }): void {
		this.logger = options.logger
	}

	private static getLogger(): Logger<ILogObj> {
		if (this.logger) {
			return this.logger
		}

		throw new Error('UrlParams not configured. Call UrlParams.configure({ logger }) during renderer bootstrap.')
	}

	private static init(): URLSearchParams {
		const search = window.location.search

		if (!this.usp) {
			this.usp = new URLSearchParams(search)
			this.usp.originalSearch = search
			return this.usp
		}

		if (this.usp.originalSearch !== search) {
			this.usp = new URLSearchParams(search)
			this.usp.originalSearch = search
		}

		return this.usp
	}

	public static get(name: UrlParam): string | null {
		const usp = this.init()
		return usp.get(name)
	}

	public static has(name: UrlParam): boolean {
		return this.get(name) !== null
	}

	public static getNumber(name: UrlParam, _default = 0): number {
		const value = this.get(name)
		if (!value) {
			return _default
		}

		const parsed = parseFloat(value)
		if (Number.isNaN(parsed)) {
			this.getLogger().warn(`Malformed url param "${name}"`, value)
			return _default
		}

		return parsed
	}

	public static getNumbers(name: UrlParam, _default?: number[]): number[] | null {
		const value = this.get(name)
		if (!value) {
			return _default ?? null
		}

		if (value[0] !== '[' || value[value.length - 1] !== ']') {
			this.getLogger().warn(`Malformed url param "${name}"`, value)
			return _default ?? null
		}

		const content = value.slice(1, value.length - 1).trim()
		if (!content) {
			return []
		}

		const parsed = content.split(',').map((entry) => parseFloat(entry.trim()))
		if (parsed.some((entry) => Number.isNaN(entry))) {
			this.getLogger().warn(`Malformed url param "${name}"`, value)
			return _default ?? null
		}

		return parsed
	}

	public static getBool(name: UrlParam, expectedValue = '1'): boolean {
		const value = this.get(name)
		if (!value) {
			return false
		}

		return value === expectedValue
	}

	public static getAll(): Record<string, string | null> {
		const usp = this.init()

		return URL_PARAMS.reduce<Record<string, string | null>>((acc, param) => {
			acc[param.name] = usp.get(param.name)
			return acc
		}, {})
	}
}
