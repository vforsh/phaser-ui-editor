import { NinePatchPlugin } from '@koreez/phaser3-ninepatch'
import Phaser from 'phaser'
import { useLayoutEffect, useRef } from 'react'
import { AppCommands } from '../../AppCommands'
import { AppEvents } from '../../AppEvents'
import { usePhaserScope } from '../../di/DiContext'
import { UndoHub } from '../../history/UndoHub'
import { ProjectConfig } from '../../project/ProjectConfig'
import { PhaserApp } from './phaser/PhaserApp'
import { TypedEventEmitter } from './phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from './phaser/robowhale/utils/events/CommandEmitter'

declare global {
	interface Window {
		/**
		 * Last created Phaser instance for the Canvas.
		 * Used only to reliably dispose the old Phaser instance during Vite HMR / Fast Refresh.
		 */
		__canvasPhaserAppForHmr?: PhaserApp | null
	}
}

// Ensure we don't keep a stale Phaser instance across Vite HMR updates.
//
// Important: React owns the `<canvas>` element. If we call `destroy(true)`, Phaser will remove the canvas
// from the DOM, leaving React with a ref to a detached node. This breaks re-init after HMR.
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		const current = window.__canvasPhaserAppForHmr
		if (!current) {
			return
		}

		try {
			current.destroy(false)
		} catch (e) {
			console.error('[canvas] HMR dispose: Phaser destroy failed', e)
		} finally {
			window.__canvasPhaserAppForHmr = null
		}
	})
}

type Props = {
	projectDir: string
	projectConfig: ProjectConfig
	appEvents: TypedEventEmitter<AppEvents>
	appCommands: CommandEmitter<AppCommands>
	undoHub: UndoHub
}

export const Canvas: React.FC<Props> = ({ projectDir, projectConfig, appEvents, appCommands, undoHub }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const phaserAppRef = useRef<PhaserApp | null>(null)
	const phaserScope = usePhaserScope()
	const activeProjectDirRef = useRef<string | null>(null)
	const projectConfigRef = useRef<ProjectConfig>(projectConfig)

	// Keep the latest config without forcing Phaser re-init.
	projectConfigRef.current = projectConfig

	useLayoutEffect(() => {
		let cancelled = false
		let rafId = 0

		const destroyCurrent = (reason: string) => {
			if (!phaserAppRef.current) {
				return
			}

			phaserScope.events?.destroy()
			phaserScope.commands?.destroy()
			phaserScope.events = null
			phaserScope.commands = null

			try {
				// Keep the canvas element; React owns it. (`destroy(true)` would remove it from the DOM.)
				phaserAppRef.current.destroy(false)
			} catch (e) {
				console.error('[canvas] Phaser destroy failed', { reason, error: e })
			}

			if (window.__canvasPhaserAppForHmr === phaserAppRef.current) {
				window.__canvasPhaserAppForHmr = null
			}
			phaserAppRef.current = null
			activeProjectDirRef.current = null
		}

		const tryInit = () => {
			if (cancelled) {
				return
			}

			const canvas = canvasRef.current
			const parent = canvas?.parentElement ?? null

			// During HMR / Fast Refresh, React can momentarily re-render before the canvas ref (and its parent)
			// are available. We retry on the next animation frame to avoid getting stuck in a "no parent" state.
			if (!canvas || !parent) {
				rafId = window.requestAnimationFrame(tryInit)
				return
			}

			// If we already have a PhaserApp for the same project, keep it alive (unless stale).
			if (phaserAppRef.current && activeProjectDirRef.current === projectDir) {
				const sameCanvas = phaserAppRef.current.canvas === canvas
				const canvasConnected = phaserAppRef.current.canvas?.isConnected ?? false
				const matchesGlobal = window.__canvasPhaserAppForHmr === phaserAppRef.current

				if (sameCanvas && canvasConnected && matchesGlobal) {
					return
				}

				destroyCurrent('stale-instance')
			}

			// If the project changed, destroy the old instance first.
			if (phaserAppRef.current && activeProjectDirRef.current && activeProjectDirRef.current !== projectDir) {
				destroyCurrent('project-changed')
			}

			const phaserApp = createPhaserApp(canvas, projectConfigRef.current, appEvents, appCommands, undoHub)

			phaserScope.events = phaserApp.ev3nts
			phaserScope.commands = phaserApp.commands

			phaserAppRef.current = phaserApp
			window.__canvasPhaserAppForHmr = phaserApp
			activeProjectDirRef.current = projectDir
		}

		tryInit()

		return () => {
			cancelled = true
			if (rafId) {
				window.cancelAnimationFrame(rafId)
			}
			destroyCurrent('react-effect-cleanup')
		}
	}, [projectDir, appEvents, appCommands, phaserScope, undoHub])

	return (
		<canvas
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
	appCommands: CommandEmitter<AppCommands>,
	undoHub: UndoHub
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

	return new PhaserApp({
		phaserConfig: config,
		projectConfig,
		appEvents,
		appCommands,
		undoHub,
	})
}
