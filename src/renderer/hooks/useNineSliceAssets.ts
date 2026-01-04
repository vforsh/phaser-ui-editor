import { State, state, useSnapshot } from '@state/State'
import { useMemo } from 'react'

import { AssetTreeImageData, AssetTreeSpritesheetData, getAssetsOfType } from '../types/assets'

function isNineSliceImage(image: AssetTreeImageData) {
	return image.scale9Borders !== undefined
}

function hasNineSliceFrames(spritesheet: AssetTreeSpritesheetData) {
	return getAssetsOfType(spritesheet.frames, 'spritesheet-frame').some((frame) => frame.scale9Borders !== undefined)
}

function getNineSliceFrames(texture: AssetTreeSpritesheetData) {
	return getAssetsOfType(texture.frames, 'spritesheet-frame')
		.filter((frame) => frame.scale9Borders !== undefined)
		.sort()
}

export function useNineSliceAssets() {
	const assetsSnap = useSnapshot(state.assets.items)

	const textures = useMemo(() => {
		const images = getAssetsOfType(assetsSnap as State['assets']['items'], 'image').filter((item) => isNineSliceImage(item))
		const spritesheets = getAssetsOfType(assetsSnap as State['assets']['items'], 'spritesheet').filter((item) =>
			hasNineSliceFrames(item),
		)

		return [...images, ...spritesheets]
	}, [assetsSnap])

	const memoizedNineSliceFrames = useMemo(() => {
		return (texture: AssetTreeSpritesheetData) => getNineSliceFrames(texture)
	}, [])

	return {
		textures,
		getNineSliceFrames: memoizedNineSliceFrames,
	}
}
