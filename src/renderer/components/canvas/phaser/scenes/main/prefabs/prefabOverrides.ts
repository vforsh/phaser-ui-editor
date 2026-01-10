import type {
	NodeAddress,
	PrefabComponentOverride,
	PrefabObjectPatch,
	PrefabObjectOverride,
} from '../../../../../../types/prefabs/PrefabDocument'
import type { EditableComponentJson } from '../objects/components/base/EditableComponent'
import type { EditableBitmapTextJson } from '../objects/EditableBitmapText'
import type { EditableContainerJson } from '../objects/EditableContainer'
import type { EditableGraphicsJson } from '../objects/EditableGraphics'
import type { EditableImageJson } from '../objects/EditableImage'
import type { EditableNineSliceJson } from '../objects/EditableNineSlice'
import type { EditableObjectJson } from '../objects/EditableObject'
import type { EditableTextJson } from '../objects/EditableText'

type PatchableObjectJson =
	| EditableContainerJson
	| EditableImageJson
	| EditableNineSliceJson
	| EditableTextJson
	| EditableBitmapTextJson
	| EditableGraphicsJson

const COMMON_KEYS: Array<keyof PrefabObjectPatch> = [
	'name',
	'visible',
	'locked',
	'x',
	'y',
	'angle',
	'scale',
	'alpha',
	'originX',
	'originY',
	'width',
	'height',
	'depth',
	'blendMode',
	'displayWidth',
	'displayHeight',
]

const TYPE_KEYS: Record<EditableObjectJson['type'], Array<keyof PrefabObjectPatch>> = {
	Container: [],
	Image: ['tint', 'tintFill', 'textureKey', 'frameKey'],
	NineSlice: ['ninePatchConfig', 'textureKey', 'frameKey'],
	Text: ['text', 'style'],
	BitmapText: ['text', 'font', 'fontSize', 'align', 'maxWidth'],
	Graphics: ['shape', 'fill', 'stroke'],
}

function getPatchKeys(type: EditableObjectJson['type']): Array<keyof PrefabObjectPatch> {
	return COMMON_KEYS.concat(TYPE_KEYS[type] ?? [])
}

function getValue(obj: PatchableObjectJson, key: keyof PrefabObjectPatch) {
	return obj[key as keyof PatchableObjectJson]
}

export function applyObjectPatch(target: PatchableObjectJson, patch: PrefabObjectPatch): void {
	const keys = getPatchKeys(target.type)
	for (const key of keys) {
		if (key in patch) {
			;(target as Record<string, unknown>)[key] = patch[key]
		}
	}
}

export function diffObjectPatch(base: PatchableObjectJson, current: PatchableObjectJson): PrefabObjectPatch {
	const patch: PrefabObjectPatch = {}
	const keys = getPatchKeys(base.type)

	for (const key of keys) {
		const baseValue = getValue(base, key)
		const currentValue = getValue(current, key)
		if (baseValue === currentValue) {
			continue
		}
		if (typeof baseValue === 'object' && baseValue && typeof currentValue === 'object' && currentValue) {
			if (JSON.stringify(baseValue) === JSON.stringify(currentValue)) {
				continue
			}
		}
		;(patch as Record<string, unknown>)[key] = currentValue
	}

	return patch
}

export function buildObjectOverride(
	target: NodeAddress,
	base: PatchableObjectJson,
	current: PatchableObjectJson,
): PrefabObjectOverride | null {
	const patch = diffObjectPatch(base, current)
	if (Object.keys(patch).length === 0) {
		return null
	}
	return { target, patch }
}

export function buildComponentOverrides(
	target: NodeAddress,
	baseComponents: EditableComponentJson[],
	currentComponents: EditableComponentJson[],
): PrefabComponentOverride[] {
	const overrides: PrefabComponentOverride[] = []
	const baseById = new Map(baseComponents.map((component) => [component.id, component]))

	for (const current of currentComponents) {
		const base = baseById.get(current.id)
		if (!base) {
			continue
		}

		const patch: Record<string, unknown> = {}
		for (const key of Object.keys(current)) {
			if (key === 'id' || key === 'type') {
				continue
			}
			const baseValue = (base as Record<string, unknown>)[key]
			const currentValue = (current as Record<string, unknown>)[key]
			if (baseValue === currentValue) {
				continue
			}
			if (typeof baseValue === 'object' && baseValue && typeof currentValue === 'object' && currentValue) {
				if (JSON.stringify(baseValue) === JSON.stringify(currentValue)) {
					continue
				}
			}
			patch[key] = currentValue
		}

		if (Object.keys(patch).length > 0) {
			overrides.push({ target, componentId: current.id, patch })
		}
	}

	return overrides
}

export function applyComponentOverride(target: EditableComponentJson, patch: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(patch)) {
		if (key === 'id' || key === 'type') {
			continue
		}
		;(target as Record<string, unknown>)[key] = value
	}
}
