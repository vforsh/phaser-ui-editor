const topLevelKeys = new Set([
	'x',
	'y',
	'angle',
	'originX',
	'originY',
	'visible',
	'alpha',
	'depth',
	'rotation',
	'flipX',
	'flipY',
	'width',
	'height',
	'displayWidth',
	'displayHeight',
	'tint',
	'tintFill',
])

const nestedKeys: Record<string, Set<string>> = {
	scale: new Set(['x', 'y']),
}

export type PatchApplyResult = {
	applied: number
	ignored: string[]
}

export function applyWhitelistedPatch(target: Record<string, unknown>, patch: Record<string, unknown>): PatchApplyResult {
	let applied = 0
	const ignored: string[] = []

	for (const [key, value] of Object.entries(patch)) {
		const nested = nestedKeys[key]
		if (nested) {
			const targetValue = target[key]
			if (targetValue && typeof targetValue === 'object' && value && typeof value === 'object') {
				for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
					if (!nested.has(nestedKey)) {
						ignored.push(`${key}.${nestedKey}`)
						continue
					}
					;(targetValue as Record<string, unknown>)[nestedKey] = nestedValue
					applied += 1
				}
				continue
			}

			ignored.push(key)
			continue
		}

		if (!topLevelKeys.has(key)) {
			ignored.push(key)
			continue
		}

		target[key] = value
		applied += 1
	}

	return { applied, ignored }
}
