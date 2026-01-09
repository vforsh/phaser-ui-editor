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
		name: 'prefabId',
		description:
			'Prefab asset id to auto-open on boot (requires `projectPath`). Prefab id takes precedence over `prefabPath` when both are set.',
		group: 'project',
	},
	{
		name: 'prefabPath',
		description:
			'Project-relative prefab path to auto-open on boot (requires `projectPath`). Use the path returned by `window.editor.listAssetsTree()`. `prefabId` takes precedence when both are set.',
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
