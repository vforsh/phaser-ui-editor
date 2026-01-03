let _blendModeEntries: [string, number][]

function blendModeEntries() {
	if (!_blendModeEntries) {
		_blendModeEntries = Object.entries(Phaser.BlendModes).map(([key, value]) => [key, value as number])
	}

	return _blendModeEntries
}

export function blendmodeToString(blendMode: number): string | undefined {
	return blendModeEntries().find(([_, value]) => value === blendMode)?.[0]
}

export function blendmodeToNumber(blendMode: string): number | undefined {
	return blendModeEntries().find(([key]) => key === blendMode)?.[1]
}
