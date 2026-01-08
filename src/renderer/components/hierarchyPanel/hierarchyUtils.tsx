import { EditableObjectJson, EditableObjectType } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { state } from '@state/State'
import { Group as GroupIcon, Image as ImageIcon, ImageUpscale, Square, Type, TypeOutline } from 'lucide-react'
import React from 'react'
import { match } from 'ts-pattern'

export function getHierarchyItemIcon(type: EditableObjectType, size = 16): React.ReactNode {
	return match({ type })
		.with({ type: 'Container' }, () => <GroupIcon size={size} />)
		.with({ type: 'Image' }, () => <ImageIcon size={size} />)
		.with({ type: 'NineSlice' }, () => <ImageUpscale size={size} />)
		.with({ type: 'Graphics' }, () => <Square size={size} />)
		.with({ type: 'BitmapText' }, () => <TypeOutline size={size} />)
		.with({ type: 'Text' }, () => <Type size={size} />)
		.exhaustive()
}

/**
 * Get the asset id of the object.
 * If the object is the root of a prefab, return the prefab id.
 * If the object has a prefab, return the prefab id (this is for containers only)
 * If the object has an asset, return the asset id (this is for images, spritesheets, etc.)
 * Otherwise, return undefined.
 */
export function getLinkedAssetId(objState: EditableObjectJson, isRoot: boolean): string | undefined {
	if (isRoot) {
		return state.canvas.currentPrefab?.id
	}

	const asset = 'asset' in objState ? objState.asset : null
	if (asset) {
		return asset.id
	}

	const prefab = 'prefab' in objState ? objState.prefab : null
	if (prefab) {
		return prefab.id
	}

	return undefined
}
