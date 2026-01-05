import { ILogObj, Logger } from 'tslog'

import { EditContextsManager } from './editContext/EditContextsManager'
import { EditContextFrame } from './EditContextFrame'
import { Grid } from './Grid'
import { EditableContainer } from './objects/EditableContainer'
import { EditableObject } from './objects/EditableObject'
import { Rulers } from './Rulers'

type DimmableKind = Exclude<EditableObject['kind'], 'Container'>

type ColorMatrixGameObject = EditableObject & {
	postFX: Phaser.GameObjects.Components.FX & {
		addColorMatrix: () => Phaser.FX.ColorMatrix
	}
}

interface ContextDimmingOptions {
	logger: Logger<ILogObj>
	editContexts: EditContextsManager
	getSuperRoot: () => EditableContainer
	grid: Grid
	rulers: Rulers
	contextFrame: EditContextFrame
	shutdownSignal: AbortSignal
}

/**
 * Canvas "inactive context" dimming.
 *
 * Applies a dimming `postFX` ColorMatrix to **editable leaf nodes** that are *outside* the currently
 * active `EditContext.target` subtree (active subtree stays full color).
 *
 * - **Never dim**: `Grid`, `Rulers`, `EditContextFrame`
 * - **Event-driven**: updates on `context-switched` + `hierarchy-changed` (microtask debounced)
 * - **Non-persistent**: does not touch `alpha` / `tint` / container-level props (avoids state sync + cascades)
 */
export class ContextDimming {
	private readonly logger: Logger<ILogObj>
	private readonly editContexts: EditContextsManager
	private readonly getSuperRoot: () => EditableContainer
	private readonly neverDim = new Set<Phaser.GameObjects.GameObject>()
	private readonly dimmedObjects = new Set<EditableObject>()
	private readonly dimmedFx = new WeakMap<Phaser.GameObjects.GameObject, Phaser.FX.ColorMatrix>()
	private readonly warnedKinds = new Set<string>()
	private pendingUpdate = false
	private destroyed = false

	constructor(private readonly deps: ContextDimmingOptions) {
		this.logger = deps.logger.getSubLogger({ name: ':context-dimming' })
		this.editContexts = deps.editContexts
		this.getSuperRoot = deps.getSuperRoot
		this.neverDim.add(deps.grid)
		this.neverDim.add(deps.rulers)
		this.neverDim.add(deps.contextFrame)
	}

	public install(): void {
		if (this.destroyed) {
			return
		}

		const signal = this.deps.shutdownSignal

		this.editContexts.on('context-switched', () => this.scheduleUpdate(), this, signal)

		const superRoot = this.getSuperRoot()
		superRoot.events.on('hierarchy-changed', () => this.scheduleUpdate(), this, signal)

		signal.addEventListener('abort', () => this.destroy())

		this.scheduleUpdate()
	}

	public destroy(): void {
		if (this.destroyed) {
			return
		}

		this.destroyed = true
		this.clearAll()
	}

	private scheduleUpdate(): void {
		if (this.pendingUpdate || this.destroyed) {
			return
		}

		this.pendingUpdate = true

		Promise.resolve().then(() => {
			this.pendingUpdate = false
			if (this.destroyed) {
				return
			}

			this.refresh()
		})
	}

	private refresh(): void {
		const current = this.editContexts.current
		if (!current) {
			this.clearAll()
			return
		}

		const nextDim = new Set<EditableObject>()
		const superRoot = this.getSuperRoot()
		const activeSubtree = new Set<EditableObject>()
		this.collectSubtree(current.target, activeSubtree)

		this.collectLeaves(superRoot, (leaf) => {
			if (!activeSubtree.has(leaf)) {
				nextDim.add(leaf)
			}
		})

		this.applyDiff(nextDim)
	}

	private collectSubtree(container: EditableContainer, out: Set<EditableObject>): void {
		const stack: EditableObject[] = [container]

		while (stack.length > 0) {
			const node = stack.pop()
			if (!node) {
				continue
			}

			if (out.has(node)) {
				continue
			}

			out.add(node)

			if (node instanceof EditableContainer) {
				node.editables.forEach((child) => stack.push(child))
			}
		}
	}

	private collectLeaves(container: EditableContainer, visit: (obj: EditableObject) => void): void {
		const stack = [...container.editables]

		while (stack.length > 0) {
			const obj = stack.pop()
			if (!obj) {
				continue
			}

			if (obj instanceof EditableContainer) {
				obj.editables.forEach((child) => stack.push(child))
				continue
			}

			visit(obj)
		}
	}

	private applyDiff(nextDim: Set<EditableObject>): void {
		for (const obj of Array.from(this.dimmedObjects)) {
			if (nextDim.has(obj)) {
				continue
			}

			this.clearDim(obj)
		}

		for (const obj of nextDim) {
			if (this.dimmedObjects.has(obj)) {
				continue
			}

			this.applyDim(obj)
		}
	}

	private applyDim(obj: EditableObject): void {
		if (this.dimmedObjects.has(obj)) {
			return
		}

		if (!this.isDimmable(obj)) {
			return
		}

		if (this.neverDim.has(obj)) {
			return
		}

		if (!this.supportsColorMatrix(obj)) {
			this.warnOnce(obj)
			return
		}

		const fx = obj.postFX.addColorMatrix()
		fx.contrast(-0.5, true)

		this.dimmedFx.set(obj, fx)
		this.dimmedObjects.add(obj)
	}

	private clearDim(obj: EditableObject): void {
		const fx = this.dimmedFx.get(obj)
		if (!fx) {
			this.dimmedObjects.delete(obj)
			return
		}

		obj.postFX?.remove?.(fx as unknown as Phaser.FX.Controller)

		this.dimmedFx.delete(obj)
		this.dimmedObjects.delete(obj)
	}

	private clearAll(): void {
		Array.from(this.dimmedObjects).forEach((obj) => this.clearDim(obj))
	}

	private isDimmable(obj: EditableObject): obj is EditableObject & { kind: DimmableKind } {
		return obj.kind !== 'Container'
	}

	private supportsColorMatrix(obj: EditableObject): obj is ColorMatrixGameObject {
		return Boolean(obj.postFX?.addColorMatrix)
	}

	private warnOnce(obj: EditableObject): void {
		const key = obj.constructor?.name ?? obj.kind
		if (this.warnedKinds.has(key)) {
			return
		}

		this.warnedKinds.add(key)
		this.logger.warn(`postFX.addColorMatrix is not available on '${key}', skipping dimming`)
	}
}
