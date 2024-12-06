import Phaser from 'phaser'
import { useLayoutEffect, useRef } from 'react'
import { ref } from 'valtio'
import { AppCommands } from '../../AppCommands'
import { AppEvents } from '../../AppEvents'
import { ProjectConfig } from '../../project/ProjectConfig'
import { state } from '../../state/State'
import { PhaserApp } from './phaser/PhaserApp'
import { TypedEventEmitter } from './phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './phaser/robowhale/utils/events/CommandEmitter'

type Props = {
	projectConfig: ProjectConfig | null
	appEvents: TypedEventEmitter<AppEvents> | null
	appCommands: CommandEmitter<AppCommands> | null
}

// use memo to prevent re-rendering of the canvas element
// it will only re-render when the projectConfig changes
export const Canvas: React.FC<Props> = ({ projectConfig, appEvents, appCommands }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)

	const phaserAppRef = useRef<PhaserApp | null>(null)

	useLayoutEffect(() => {
		if (canvasRef.current && canvasRef.current.parentElement && projectConfig && appEvents && appCommands) {
			const phaserApp = createPhaserApp(canvasRef.current, projectConfig, appEvents, appCommands)

			state.phaser = ref({
				events: phaserApp.ev3nts,
				commands: phaserApp.commands,
			})

			phaserAppRef.current = phaserApp
		}

		return () => {
			if (phaserAppRef.current) {
				state.phaser?.events?.destroy()
				state.phaser?.commands?.destroy()
				state.phaser = null

				phaserAppRef.current.destroy(true)
				phaserAppRef.current = null
			}
		}
	}, [canvasRef.current]) // Dependency array includes canvasRef.current to recreate PhaserApp on each render

	// Generate a unique key for the canvas element on each render
	const key = Date.now().toString()

	return (
		<canvas
			key={key}
			ref={canvasRef}
			id="canvas"
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
	}

	return new PhaserApp(config, projectConfig, appEvents, appCommands)
}
