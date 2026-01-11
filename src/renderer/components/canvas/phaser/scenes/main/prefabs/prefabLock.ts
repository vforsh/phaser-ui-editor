import type { NodeAddress } from '@tekton/runtime'

import type { EditableObject } from '../objects/EditableObject'

import { isPrefabInstanceRuntimeRoot } from './prefabDocumentUtils'

export type PrefabLockInfo = {
	instanceRootRuntimeId: string
	address: NodeAddress
}

export function getPrefabLockInfo(obj: EditableObject): PrefabLockInfo | null {
	if (!obj.prefabMeta) {
		return null
	}

	return {
		instanceRootRuntimeId: obj.prefabMeta.instanceRootRuntimeId,
		address: obj.prefabMeta.address,
	}
}

export function isPrefabLocked(obj: EditableObject): boolean {
	return Boolean(obj.prefabMeta)
}

export function isPrefabInstanceRoot(obj: EditableObject): boolean {
	return isPrefabInstanceRuntimeRoot(obj)
}

export function isInsidePrefabInstance(obj: EditableObject): boolean {
	return Boolean(obj.prefabMeta) && !isPrefabInstanceRoot(obj)
}
