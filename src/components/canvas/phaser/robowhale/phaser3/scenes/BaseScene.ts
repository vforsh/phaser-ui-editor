import { Config } from '../../../Config'
import { FastForward } from './FastForward'
import { IPinnable, Pinner } from './Pinner'
import { IScaleable, ScaleOptions, Scaler, ScaleType } from './Scaler'

export type Key = keyof typeof Phaser.Input.Keyboard.KeyCodes

export class BaseScene extends Phaser.Scene {
	// TODO use generic type for initData
	public initData: any
	public pinner: Pinner
	public sizer: Scaler
	public fastForward: FastForward
	public shiftKey: Phaser.Input.Keyboard.Key
	public ctrlKey: Phaser.Input.Keyboard.Key
	private shutdownController: AbortController

	public get keyboard(): (Phaser.Input.Keyboard.KeyboardPlugin & Phaser.Events.EventEmitter) | null {
		return this.input.keyboard
	}

	public get activePointer(): Phaser.Input.Pointer {
		return this.input.activePointer
	}

	public init(data?: any): void {
		this.initData = data ?? undefined

		this.shutdownController = new AbortController()

		this.events.once('shutdown', this.onShutdown, this)

		this.pinner = new Pinner()

		this.sizer = new Scaler(this)

		this.fastForward = new FastForward(this)

		if (this.input.keyboard) {
			this.shiftKey = this.shiftKey ?? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
			this.ctrlKey = this.ctrlKey ?? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL)
		}
	}

	public create(): void {}

	public size(obj: IScaleable, type: ScaleType = ScaleType.EXACT, options?: ScaleOptions): void {
		this.sizer.scale(obj, type, options)
	}

	public pin(obj: IPinnable, x: number, y: number, offsetX?: number, offsetY?: number): void {
		this.pinner.pin(obj, x, y, offsetX, offsetY)
	}

	public pinAround(obj: IPinnable, anchor: IPinnable, offsetX?: number, offsetY?: number): void {
		this.pinner.pinAround(obj, anchor, offsetX, offsetY)
	}

	public resize(): void {
		this.sizer.onResize(Config.GAME_WIDTH, Config.GAME_HEIGHT, Config.ASSETS_SCALE)
		this.pinner.onResize(Config.GAME_WIDTH, Config.GAME_HEIGHT, Config.ASSETS_SCALE)
	}

	public restart(data?: object): void {
		this.game.restartScene(this.scene.key, data ?? this.initData)
	}

	public onKeyDown(key: Key, callback: (e: KeyboardEvent) => void, context?: any, signal?: AbortSignal): void {
		this.keyboard?.on(`keydown-${key}`, callback, context, signal || this.shutdownSignal)
	}

	public onceKeyDown(key: Key, callback: (e: KeyboardEvent) => void, context?: any, signal?: AbortSignal): void {
		this.keyboard?.once(`keydown-${key}`, callback, context, signal || this.shutdownSignal)
	}

	public changeScene(newScene: SceneKey, data?: any): void {
		this.game.changeScene(this.scene.key, newScene, data)
	}

	public onShutdown(): void {
		this.shutdownController.abort()

		this.pinner.destroy()
		this.pinner = null

		this.sizer.destroy()
		this.sizer = null

		this.fastForward.destroy()
		this.fastForward = null
	}

	/**
	 * Gets the shutdown signal associated with this scene.
	 *
	 * @remarks
	 * This signal can be used to listen for shutdown events and perform cleanup operations.
	 *
	 * @returns {AbortSignal} The signal that indicates when the scene is shutting down.
	 */
	public get shutdownSignal(): AbortSignal {
		return this.shutdownController.signal
	}
}
