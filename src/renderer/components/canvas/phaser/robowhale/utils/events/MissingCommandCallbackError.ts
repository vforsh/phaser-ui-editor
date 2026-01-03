export class MissingCommandCallbackError extends Error {
	constructor(public readonly command: string) {
		super(`there are no callbacks for '${command}' command`)

		this.name = 'MissingCommandCallbackError'
	}
}
