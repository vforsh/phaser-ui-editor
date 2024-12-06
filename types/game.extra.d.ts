type PhaserGameExtra = import('@/components/canvas/phaser/PhaserApp').PhaserGameExtra

declare module Phaser {
	interface Game extends PhaserGameExtra {}
}
