import { match } from 'ts-pattern'
import { PhaserAlignKey } from '../PhaserAlign'

export function getCellCenterOffset(cellPosition: PhaserAlignKey, cellWidth: number, cellHeight: number) {
	return match(cellPosition)
		.returnType<{ x: number; y: number }>()
		.with('top-left', () => ({ x: -cellWidth / 2, y: -cellHeight / 2 }))
		.with('top-center', () => ({ x: 0, y: -cellHeight / 2 }))
		.with('top-right', () => ({ x: cellWidth / 2, y: -cellHeight / 2 }))
		.with('left-center', () => ({ x: -cellWidth / 2, y: 0 }))
		.with('center', () => ({ x: 0, y: 0 }))
		.with('right-center', () => ({ x: cellWidth / 2, y: 0 }))
		.with('bottom-left', () => ({ x: -cellWidth / 2, y: cellHeight / 2 }))
		.with('bottom-center', () => ({ x: 0, y: cellHeight / 2 }))
		.with('bottom-right', () => ({ x: cellWidth / 2, y: cellHeight / 2 }))
		.exhaustive()
}
