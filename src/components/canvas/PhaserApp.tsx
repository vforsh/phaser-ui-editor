import Phaser from 'phaser'
import { useLayoutEffect, useRef } from 'react'

interface PhaserAppProps {
	width?: number
	height?: number
}

export default function PhaserApp({ width, height }: PhaserAppProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const gameRef = useRef<Phaser.Game | null>(null)

	useLayoutEffect(() => {
		if (!containerRef.current || gameRef.current) return

		const game = createPhaserApp(containerRef.current)
		gameRef.current = game

		const handleResize = () => {
			// game.scale.refresh();
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
			gameRef.current?.destroy(true)
			gameRef.current = null
		}
	}, [])

	return (
		<div
			ref={containerRef}
			style={{
				width: '100%',
				height: '100%',
				backgroundColor: 'red',
			}}
		/>
	)
}

function createPhaserApp(parent: HTMLElement) {
	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		parent,
		backgroundColor: '#1488fc',
		scale: {
			mode: Phaser.Scale.NONE,
			width: '300px',
			height: '300px',
			autoCenter: Phaser.Scale.CENTER_BOTH,
			expandParent: false,
		},
		scene: {
			create: function () {
				const { width, height } = this.scale

				// Add a visual indicator that Phaser is running
				const circle = this.add.circle(width / 2, height / 2, 50, 0xffffff)

				// Add some simple animation
				this.tweens.add({
					targets: circle,
					scale: 1.2,
					duration: 1000,
					yoyo: true,
					repeat: -1,
					ease: 'Sine.inOut',
				})
			},
			update: function () {
				// Game loop
			},
		},
	}

	return new Phaser.Game(config)
}
