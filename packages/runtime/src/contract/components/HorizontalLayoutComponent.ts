import type { PhaserAlignKey } from '../phaser/PhaserAlign'

export type HorizontalLayoutComponentJson = {
	type: 'horizontal-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
}
