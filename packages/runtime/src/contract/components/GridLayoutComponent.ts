import type { PhaserAlignKey } from '../phaser/PhaserAlign'

export type GridLayoutComponentJson = {
	type: 'grid-layout'
	id: string
	active: boolean
	columns: number
	cellWidth: number
	cellHeight: number
	cellPosition: PhaserAlignKey
	spacingX: number
	spacingY: number
	centerLastRow: boolean
}
