import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { ILogObj, Logger } from 'tslog'
import { signalFromEvent } from '../../../robowhale/utils/events/create-abort-signal-from-event'
import { Selection } from './Selection'
import type { Events, TransformControlOptions, ReadonlyTransformControlOptions } from './transformControls/types-math-cursor'
import { CursorManager } from './transformControls/types-math-cursor'
import { HandleFactory, TextureFactory, inflateBorderHitArea } from './transformControls/factories'
import { RotateInteraction, ResizeInteraction, SelectionFollower } from './transformControls/interactions'

/**
 * Controls that allows to adjust scale, angle and origin of a transformable object.
 */
export class TransformControls extends Phaser.GameObjects.Container {
	public static readonly TAG = 'transform-control'

	private readonly options: ReadonlyTransformControlOptions
	private readonly logger: Logger<ILogObj>
	private destroySignal: AbortSignal

	private readonly cursorManager: CursorManager
	private readonly selectionFollower: SelectionFollower
	private readonly handles: ReturnType<HandleFactory['create']>

	private handlesState: Map<Phaser.GameObjects.Image, { interactive: boolean }> = new Map()

	// selection that this transform controls follows
	private target: Selection | null = null

	private __events: TypedEventEmitter<Events> = new TypedEventEmitter()

	/**
	 * Create transform controls and wire interactions.
	 */
	constructor(scene: Phaser.Scene, options: TransformControlOptions) {
		super(scene)

		this.options = options
		this.logger = options.logger

		this.destroySignal = signalFromEvent(this, Phaser.GameObjects.Events.DESTROY)

		this.cursorManager = new CursorManager()

		const textures = new TextureFactory(scene, this.options).createAll()
		this.handles = new HandleFactory(scene, this.options, textures).create()
		this.add(this.handles.innerContainer)

		this.selectionFollower = new SelectionFollower(this, this.handles)

		this.setupBorders()
		this.setupInteractions()
		this.setupHandlesState()

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this, this.destroySignal)
	}

	private setupBorders(): void {
		const { borders } = this.handles
		const borderList = [borders.top, borders.bottom, borders.left, borders.right]

		borderList.forEach((border) => {
			border.setTint(this.options.resizeBorders.color)

			const isHorizontal = border === borders.top || border === borders.bottom
			const hitAreaPadding = isHorizontal
				? { x: 0, y: this.options.resizeBorders.hitAreaPadding }
				: { x: this.options.resizeBorders.hitAreaPadding, y: 0 }
			border.setInteractive()
			inflateBorderHitArea(border.input!, hitAreaPadding.x, hitAreaPadding.y)

			border.on('pointerover', this.onBorderPointerOver.bind(this, border), this, this.destroySignal)
			border.on('pointerout', this.onBorderPointerOut.bind(this, border), this, this.destroySignal)
		})
	}

	private setupInteractions(): void {
		new RotateInteraction(
			this.scene,
			this.logger,
			this.cursorManager,
			this.options,
			this.handles.rotateKnobs,
			() => this.target,
			() => this.angle,
			this.events,
			this.destroySignal
		)

		new ResizeInteraction(
			this.scene,
			this.logger,
			this.cursorManager,
			this.options,
			this.handles.resizeKnobs,
			this.handles.borders,
			() => this.target,
			() => this.angle,
			this.events,
			this.destroySignal
		)
	}

	private setupHandlesState(): void {
		this.handles.all.forEach((handle) => {
			handle.setData(TransformControls.TAG, true)
		})

		this.events.on(
			'transform-start',
			() => {
				this.handles.all.forEach((item) => {
					this.handlesState.set(item, { interactive: Boolean(item.input?.enabled) })
					item.disableInteractive()
				})
			},
			this,
			this.destroySignal
		)

		this.events.on(
			'transform-end',
			() => {
				this.handles.all.forEach((item) => {
					if (this.handlesState.get(item)?.interactive) {
						item.setInteractive()
					}
				})

				this.handlesState.clear()
			},
			this,
			this.destroySignal
		)
	}

	private onBorderPointerOver(border: Phaser.GameObjects.Image) {
		border.setTint(0xcee9fd)

		const isHorizontal =
			border === this.handles.borders.top || border === this.handles.borders.bottom
		const cursorAngle = this.angle + (isHorizontal ? 90 : 0)
		this.cursorManager.setResizeCursor(cursorAngle)
	}

	private onBorderPointerOut(border: Phaser.GameObjects.Image) {
		border.setTint(this.options.resizeBorders.color)

		this.cursorManager.setDefaultCursor()
	}

	/**
	 * Begin following the given selection for layout and interaction.
	 */
	public startFollow(selection: Selection) {
		if (this.target === selection) {
			return
		}

		this.selectionFollower.adjustToSelection(selection)

		this.target = selection
		this.target.once('destroyed', this.stopFollow, this)

		this.revive()

		this.events.emit('start-follow', selection)
	}

	/**
	 * Stop following the current selection and hide controls.
	 */
	public stopFollow() {
		if (!this.target) {
			return
		}

		const selectionContent = this.target.objectsAsString
		this.target = null

		this.kill()

		this.events.emit('stop-follow', selectionContent)
	}

	private onUpdate(_time: number, _deltaMs: number): void {
		if (!this.target) {
			return
		}

		this.selectionFollower.adjustToSelection(this.target)
	}

	/**
	 * Clean up resources and reset cursor state.
	 */
	public destroy(): void {
		super.destroy()

		this.__events.destroy()

		this.handles.all.length = 0

		this.handlesState.clear()

		this.cursorManager.setDefaultCursor()
	}

	/**
	 * Events emitter for follow/transform lifecycle.
	 */
	public get events(): TypedEventEmitter<Events> {
		return this.__events
	}
}
