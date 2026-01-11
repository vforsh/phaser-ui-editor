import type { PhaserAlignKey } from '../phaser/PhaserAlign'

export type VerticalLayoutComponentJson = {
	type: 'vertical-layout'
	id: string
	active: boolean
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingY: number
}
