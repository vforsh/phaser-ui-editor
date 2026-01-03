import type { EditableContainerJson } from '../../../components/canvas/phaser/scenes/main/objects/EditableContainer'
import type { EditableObjectJson } from '../../../components/canvas/phaser/scenes/main/objects/EditableObject'

/**
 * Represents a single segment in a hierarchy path (e.g., "Main/Container[1]").
 */
export type PathSegment = {
	/**
	 * The name of the object.
	 */
	name: string
	/**
	 * The zero-based index of the object among siblings with the same name.
	 */
	index: number
}

export function resolveObjectIdByPath(root: EditableContainerJson, rawPath: string): string | undefined {
	const segments = parsePath(rawPath)
	if (segments.length === 0) {
		return undefined
	}

	let current: EditableObjectJson | undefined = root
	for (const segment of segments) {
		if (!current || !('children' in current)) {
			return undefined
		}

		const container = current as EditableContainerJson
		const matchingChildren = container.children.filter((child) => child.name === segment.name)
		const next = matchingChildren[segment.index]
		if (!next) {
			return undefined
		}

		current = next
	}

	return current?.id
}

export function parsePath(rawPath: string): PathSegment[] {
	const trimmed = rawPath.trim()
	if (!trimmed) {
		return []
	}

	const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed

	return cleanPath
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const match = part.match(/^(.*?)(?:\[(\d+)\])?$/)
			if (!match) {
				return { name: part, index: 0 }
			}

			const name = match[1]
			const index = match[2] ? Number.parseInt(match[2], 10) : 0
			return {
				name,
				index: Number.isNaN(index) ? 0 : index,
			}
		})
}
