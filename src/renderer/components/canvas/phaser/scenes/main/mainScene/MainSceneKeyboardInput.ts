import { BaseScene } from '@components/canvas/phaser/robowhale/phaser3/scenes/BaseScene'
import { Logger } from 'tslog'

import { MainSceneDeps } from './mainSceneTypes'

/**
 * Handles keyboard input for the MainScene, including shortcuts for saving,
 * selection manipulation, and camera zoom.
 */
export class MainSceneKeyboardInput {
	private scene: BaseScene
	private _logger: Logger<{}>

	constructor(private deps: MainSceneDeps) {
		this.scene = this.deps.scene as BaseScene
		this._logger = this.deps.logger.getSubLogger({ name: ':keyboard' })
	}

	public get logger() {
		return this._logger
	}

	public install() {
		this.addKeyboardCallbacks()
	}

	private addKeyboardCallbacks() {
		const signal = this.deps.shutdownSignal

		this.registerKeyDown('S', (e) => this.onKeyDownSave(e), signal)
		this.registerKeyDown('A', (e) => this.onKeyDownSelectAll(e), signal)

		this.registerKeyDown('R', () => this.deps.restart(), signal)
		this.registerKeyDown('F', () => this.deps.cameraService.alignToContextFrame(), signal)

		this.registerKeyDown('DELETE', () => this.deps.ops.removeSelection(), signal)
		this.registerKeyDown('BACKSPACE', () => this.deps.ops.removeSelection(), signal)

		this.registerKeyDown('LEFT', (e) => this.moveSelection(-1, 0, e), signal)
		this.registerKeyDown('RIGHT', (e) => this.moveSelection(1, 0, e), signal)
		this.registerKeyDown('UP', (e) => this.moveSelection(0, -1, e), signal)
		this.registerKeyDown('DOWN', (e) => this.moveSelection(0, 1, e), signal)

		this.registerKeyDown('OPEN_BRACKET', (e) => this.moveSelectionDownInHierarchy(e), signal)
		this.registerKeyDown('CLOSED_BRACKET', (e) => this.moveSelectionUpInHierarchy(e), signal)

		this.registerKeyDown('G', (e) => this.processGrouping(e), signal)

		this.registerKeyDown('X', () => this.deps.ops.cutSelection(), signal)
		this.registerKeyDown('C', () => this.deps.ops.copySelection(), signal)
		this.registerKeyDown('V', () => this.deps.ops.paste(), signal)

		this.registerKeyDown('ZERO', () => this.resetSelectionTransform(), signal)

		this.registerKeyDown('ONE', () => this.deps.cameraService.setZoom(1), signal)
		this.registerKeyDown('TWO', ({ shiftKey }) => this.deps.cameraService.setZoom(shiftKey ? 0.5 : 2), signal)
		this.registerKeyDown('THREE', ({ shiftKey }) => this.deps.cameraService.setZoom(shiftKey ? 0.25 : 4), signal)
	}

	private registerKeyDown(key: Parameters<BaseScene['onKeyDown']>[0], handler: (event: KeyboardEvent) => void, signal: AbortSignal) {
		this.scene.onKeyDown(
			key,
			(event: KeyboardEvent) => {
				const b = (value: boolean) => (value ? 'TRUE' : 'false')
				this._logger.info(
					`keyDown '${key}' (ctrl: ${b(event.ctrlKey)}, meta: ${b(event.metaKey)}, shift: ${b(event.shiftKey)}, alt: ${b(event.altKey)}, repeat: ${b(event.repeat)})`,
				)
				handler(event)
			},
			this,
			signal,
		)
	}

	private onKeyDownSave(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		event.preventDefault()
		void this.deps.persistence.savePrefab()
	}

	private onKeyDownSelectAll(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		event.preventDefault()
		this.deps.ops.selectAllInCurrentContext()
	}

	// These methods are proxies to ops/editContext for now, until all ops are moved to SelectionOps
	private moveSelection(dx: number, dy: number, event: KeyboardEvent) {
		this.deps.ops.moveSelection(dx, dy, event.shiftKey)
		event.preventDefault()
	}

	private moveSelectionDownInHierarchy(event: KeyboardEvent) {
		this.deps.ops.moveSelectionDownInHierarchy(event.shiftKey)
		event.preventDefault()
	}

	private moveSelectionUpInHierarchy(event: KeyboardEvent) {
		this.deps.ops.moveSelectionUpInHierarchy(event.shiftKey)
		event.preventDefault()
	}

	private processGrouping(event: KeyboardEvent) {
		if (!event.ctrlKey && !event.metaKey) {
			return
		}

		if (event.shiftKey) {
			this.deps.ops.ungroupSelection()
		} else {
			this.deps.ops.groupSelection()
		}

		event.preventDefault()
	}

	private resetSelectionTransform() {
		this.deps.ops.resetSelectionTransform()
	}
}
