import { Logger } from 'tslog'
import { logs } from './logs/logs'

export type UrlParam = GenericUrlParam

export type GenericUrlParam = 'zoom' | 'stateDevTools'

export type UrlParamsOptions = {
	logger: Logger<{}>
	search: string
}

export class UrlParams {
	private options: UrlParamsOptions
	private logger: Logger<{}>
	private usp: URLSearchParams & { originalSearch?: string }

	constructor(options: UrlParamsOptions) {
		this.options = options
		this.logger = options.logger
		this.usp = new URLSearchParams(options.search)
		this.usp.originalSearch = options.search
	}

	public get(name: UrlParam): string | null {
		let search = window.location.search

		if (this.usp.originalSearch !== search) {
			this.usp = new URLSearchParams(search)
			this.usp.originalSearch = search
		}

		return this.usp.get(name)
	}

	public has(name: UrlParam): boolean {
		return this.get(name) !== null
	}

	public getNumber(name: UrlParam, _default = 0): number {
		let value = this.get(name)
		if (value) {
			let num = parseFloat(value)
			return isNaN(num) ? _default : num
		}

		return _default
	}

	public getNumbers(name: UrlParam, _default?: number[]): number[] | null {
		let value = this.get(name)
		if (!value) {
			return _default ?? null
		}

		if (value[0] !== '[' || value[value.length - 1] !== ']') {
			console.warn('Malformed url param input', value)
			return null
		}

		let content = value.slice(1, value.length - 1)
		return content.split(',').map((numStr) => {
			return parseFloat(numStr)
		})
	}

	public getBool(name: UrlParam, expectedValue = '1'): boolean {
		let value = this.get(name)

		return !!(value && value === expectedValue)
	}
}

export const urlParams = new UrlParams({
	logger: logs.getOrCreate('url-params'),
	search: window.location.search,
})
