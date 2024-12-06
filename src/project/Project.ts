import { ProjectConfig } from './ProjectConfig'

export type ProjectOptions = {
	config: ProjectConfig
}

export class Project {
	private readonly options: ProjectOptions
	public readonly config: ProjectConfig

	constructor(options: ProjectOptions) {
		this.options = options
		this.config = options.config
	}

	public async init(): Promise<void> {
		// TODO
		// collect all textures & atlases
		// collect all fonts
		// parse l10n and collects keys

		return Promise.resolve()
	}
}
