import type { PhaserAlignKey } from '@tekton/runtime'

export type { PhaserAlignKey } from '@tekton/runtime'

export const PHASER_ALIGN = {
	'top-left': Phaser.Display.Align.TOP_LEFT,
	'top-center': Phaser.Display.Align.TOP_CENTER,
	'top-right': Phaser.Display.Align.TOP_RIGHT,
	'left-center': Phaser.Display.Align.LEFT_CENTER,
	'center': Phaser.Display.Align.CENTER,
	'right-center': Phaser.Display.Align.RIGHT_CENTER,
	'bottom-left': Phaser.Display.Align.BOTTOM_LEFT,
	'bottom-center': Phaser.Display.Align.BOTTOM_CENTER,
	'bottom-right': Phaser.Display.Align.BOTTOM_RIGHT,
} as const

export type PhaserAlign = (typeof PHASER_ALIGN)[PhaserAlignKey]

export function isPhaserAlignKey(value: string): value is PhaserAlignKey {
	return value in PHASER_ALIGN
}
