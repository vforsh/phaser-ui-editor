const CHANNELS = [
	'app',
	'state',
	'canvas',
	'assets',
	'hierarchy',
	'inspector',
	'url-params',
] as const

export type LogChannel = (typeof CHANNELS)[number]

export function isLogChannel(value: string): value is LogChannel {
	return (CHANNELS as readonly string[]).includes(value)
}
