import { NinePatchPlugin } from '@koreez/phaser3-ninepatch'
import Phaser from 'phaser'
import { useLayoutEffect, useRef } from 'react'
import { AppCommands } from '../../AppCommands'
import { AppEvents } from '../../AppEvents'
import { ProjectConfig } from '../../project/ProjectConfig'
import { usePhaserScope } from '../../di/DiContext'
import { PhaserApp } from './phaser/PhaserApp'
import { TypedEventEmitter } from './phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './phaser/robowhale/utils/events/CommandEmitter'

type Props = {
	projectConfig: ProjectConfig
	appEvents: TypedEventEmitter<AppEvents>
	appCommands: CommandEmitter<AppCommands>
}

export const Canvas: React.FC<Props> = ({ projectConfig, appEvents, appCommands }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const phaserAppRef = useRef<PhaserApp | null>(null)
	const phaserScope = usePhaserScope()

	useLayoutEffect(() => {
		// Only create Phaser app if we have all required props
		if (!canvasRef.current?.parentElement) {
			return
		}

		const phaserApp = createPhaserApp(canvasRef.current, projectConfig, appEvents, appCommands)

		phaserScope.events = phaserApp.ev3nts
		phaserScope.commands = phaserApp.commands

		phaserAppRef.current = phaserApp

		return () => {
			if (phaserAppRef.current) {
				phaserScope.events?.destroy()
				phaserScope.commands?.destroy()
				phaserScope.events = null
				phaserScope.commands = null

				phaserAppRef.current.destroy(true)
				phaserAppRef.current = null
			}
		}
	}, [projectConfig, appEvents, appCommands, phaserScope]) // Only recreate when these props change

	// use a unique key to force re-rendering of the canvas
	const key = Date.now()

	return (
		<canvas
			key={key}
			ref={canvasRef}
			id="canvas"
			// specify tab index to make canvas focusable
			tabIndex={0}
			style={{
				borderRadius: 'inherit',
				maxWidth: '100%',
				maxHeight: '100%',
			}}
		/>
	)
}

function createPhaserApp(
	canvas: HTMLCanvasElement,
	projectConfig: ProjectConfig,
	appEvents: TypedEventEmitter<AppEvents>,
	appCommands: CommandEmitter<AppCommands>
) {
	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.WEBGL,
		scale: {
			expandParent: false,
			mode: Phaser.Scale.NONE,
		},
		parent: canvas.parentElement,
		canvas: canvas,
		backgroundColor: '#242424',
		audio: {
			noAudio: true,
		},
		banner: false,
		plugins: {
			global: [
				{
					key: 'NinePatchPlugin',
					plugin: NinePatchPlugin,
					start: true,
				},
			],
		},
	}

	return new PhaserApp(config, projectConfig, appEvents, appCommands)
}
