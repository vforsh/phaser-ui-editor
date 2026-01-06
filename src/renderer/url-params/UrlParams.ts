import { ILogObj, Logger } from 'tslog'

import { URL_PARAMS, type UrlParam } from './UrlParamsDefinitions'

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
