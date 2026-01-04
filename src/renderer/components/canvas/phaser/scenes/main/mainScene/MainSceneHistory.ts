import { state, subscribe } from '@state/State'
import { match } from 'ts-pattern'

import { EditableContainer } from '../objects/EditableContainer'
import { EditableContainerJson } from '../objects/EditableContainer'
import { isObjectOfType } from '../objects/EditableObject'
import { MainSceneDeps } from './mainSceneTypes'

export type TransformType = 'rotate' | 'resize' | 'origin'

export type TransformControlsSnapshot = {
	before: CanvasDocumentSnapshot
	type: TransformType
}

/**
 * A full-fidelity snapshot of the canvas document, used by undo/redo and
 * for grouping continuous interactions (e.g. drag/move/transform controls).
 *
 * Notes:
 * - `documentRevision` is the authoritative "did content change?" marker.
 * - `rootJson` is only used to restore the document for undo/redo.
 */
export type CanvasDocumentSnapshot = {
	rootJson: EditableContainerJson
	documentRevision: number
	activeContextId?: string
	selectionIds: string[]
	camera?: { zoom: number; scrollX: number; scrollY: number }
}

/**
 * Manages undo/redo history, document snapshots, and unsaved changes tracking for the canvas.
 * It handles capturing and applying snapshots of the object hierarchy, selection, and camera state.
 * Operations are synchronized with the global UndoHub and the application's reactive state.
 * Includes specialized handling for continuous transformations via transform controls.
 */
export class MainSceneHistory {
	private isRestoringFromHistory = false
	private transformControlsSnapshot?: TransformControlsSnapshot
	private rootUnsub?: () => void
	private subscribedRoot?: object
	private suppressRootRevisionDepth = 0

	constructor(private deps: MainSceneDeps) {
		this.syncRootSubscription()

		subscribe(
			state.canvas as any,
			(ops: any[]) => {
				const didRootChange = ops.some((op) => op[1]?.[0] === 'root')
				if (!didRootChange) {
					return
				}

				this.syncRootSubscription()
			},
			{ signal: this.deps.shutdownSignal },
		)
	}

	private syncRootSubscription(): void {
		const root = state.canvas.root as unknown

		if (root === this.subscribedRoot) {
			return
		}

		this.rootUnsub?.()
		this.rootUnsub = undefined
		this.subscribedRoot = undefined

		if (!root || typeof root !== 'object') {
			return
		}

		let unsub: (() => void) | undefined
		try {
			unsub = subscribe(root as any, () => this.onRootStateChange(), { signal: this.deps.shutdownSignal })
		} catch {
			return
		}

		this.subscribedRoot = root
		this.rootUnsub = unsub
	}

	private onRootStateChange() {
		if (this.isRestoringFromHistory) {
			return
		}

		if (this.suppressRootRevisionDepth > 0) {
			return
		}

		state.canvas.documentRevision++
		this.updateUnsavedChanges()
	}

	public get isRestoring(): boolean {
		return this.isRestoringFromHistory
	}

	/**
	 * Sets the baseline revision used for unsaved-changes detection.
	 */
	public setBaseline() {
		state.canvas.baselineDocumentRevision = state.canvas.documentRevision
		this.updateUnsavedChanges()
	}

	public async applySnapshot(snapshot: CanvasDocumentSnapshot) {
		if (!snapshot.rootJson) {
			return
		}

		this.isRestoringFromHistory = true

		try {
			state.canvas.documentRevision = snapshot.documentRevision

			const root = this.deps.getRoot()
			if (root) {
				root.destroy()
			}

			this.deps.editContexts.reset()

			const newRoot = this.deps.objectsFactory.fromJson(snapshot.rootJson, true) as EditableContainer
			this.deps.setRoot(newRoot)
			this.deps.getSuperRoot().add(newRoot)

			let targetContext: EditableContainer | undefined = newRoot
			if (snapshot.activeContextId) {
				const obj = this.deps.objectsFactory.getObjectById(snapshot.activeContextId)
				if (obj && isObjectOfType(obj, 'Container')) {
					targetContext = obj
				}
			}

			if (targetContext) {
				this.deps.editContexts.switchTo(targetContext)
			}

			const context = this.deps.editContexts.current
			if (context && snapshot.selectionIds?.length) {
				const selectableObjects = snapshot.selectionIds
					.map((id) => this.deps.objectsFactory.getObjectById(id))
					.filter((obj): obj is any => Boolean(obj))
					.filter((obj) => obj.parentContainer === context.target)

				if (selectableObjects.length) {
					context.setSelection(selectableObjects)
				} else {
					context.cancelSelection()
				}
			} else if (context) {
				context.cancelSelection()
			}

			if (snapshot.camera) {
				const camera = this.deps.scene.cameras.main
				camera.setZoom(snapshot.camera.zoom)
				camera.setScroll(snapshot.camera.scrollX, snapshot.camera.scrollY)
				this.deps.onResizeOrCameraChange()
			}

			state.canvas.root = newRoot.stateObj
			state.canvas.objectById = (id: string) => this.deps.objectsFactory.getObjectById(id)?.stateObj
			state.canvas.siblingIds = (id: string) => this.deps.getObjectSiblingsIds(id)
			state.canvas.selection = snapshot.selectionIds ?? []
			state.canvas.activeContextId = snapshot.activeContextId

			this.updateUnsavedChanges()
		} finally {
			this.isRestoringFromHistory = false
		}
	}

	public updateUnsavedChanges() {
		state.canvas.hasUnsavedChanges = state.canvas.documentRevision !== state.canvas.baselineDocumentRevision
	}

	/**
	 * Runs `fn` while suppressing root subscription revision bumps, then increments `documentRevision` once.
	 *
	 * Used to batch multi-object edits (e.g. drag end) into a single "document changed" tick, avoiding
	 * expensive UI churn.
	 */
	public withBatchedDocumentRevision<T>(fn: () => T): T {
		if (this.isRestoringFromHistory) {
			return fn()
		}

		this.suppressRootRevisionDepth++
		try {
			return fn()
		} finally {
			this.suppressRootRevisionDepth--
			if (this.suppressRootRevisionDepth === 0) {
				state.canvas.documentRevision++
				this.updateUnsavedChanges()
			}
		}
	}

	public async push(label: string, before: CanvasDocumentSnapshot, after: CanvasDocumentSnapshot) {
		if (before.documentRevision === after.documentRevision) {
			return
		}

		const prefabId = this.deps.sceneInitData.prefabAsset.id

		this.undoHub.push({
			label,
			domains: ['canvas'],
			timestamp: Date.now(),
			isValid: () => state.canvas.currentPrefab?.id === prefabId,
			undo: async () => {
				await this.applySnapshot(before)
				this.updateUnsavedChanges()
			},
			redo: async () => {
				await this.applySnapshot(after)
				this.updateUnsavedChanges()
			},
		})

		this.updateUnsavedChanges()
	}

	public async withUndo<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
		if (this.isRestoringFromHistory) {
			return await fn()
		}

		const before = this.captureSnapshot()
		const result = await fn()
		const after = this.captureSnapshot()
		await this.push(label, before, after)
		return result
	}

	public captureSnapshot(): CanvasDocumentSnapshot {
		const currentContext = this.deps.editContexts.current
		const selection = currentContext?.selection
		const selectionIds = selection ? selection.objects.map((obj: any) => obj.id) : []

		return {
			rootJson: this.deps.rootToJson(),
			documentRevision: state.canvas.documentRevision,
			activeContextId: currentContext?.target.id,
			selectionIds,
			camera: {
				zoom: this.deps.scene.cameras.main.zoom,
				scrollX: this.deps.scene.cameras.main.scrollX,
				scrollY: this.deps.scene.cameras.main.scrollY,
			},
		}
	}

	public startTransformControlsUndo(type: TransformType): void {
		if (this.isRestoringFromHistory) {
			return
		}

		if (this.transformControlsSnapshot) {
			return
		}

		this.transformControlsSnapshot = { before: this.captureSnapshot(), type }
	}

	public stopTransformControlsUndo(): void {
		if (!this.transformControlsSnapshot) {
			return
		}

		this.withBatchedDocumentRevision(() => {
			const selection = this.deps.editContexts.current?.selection
			if (selection) {
				selection.objects.forEach((obj) => {
					obj.setPosition(obj.x, obj.y)
					obj.setAngle(obj.angle)

					if (obj.kind !== 'Container' && obj.kind !== 'NineSlice') {
						obj.setOrigin(obj.originX, obj.originY)
					}

					if (obj.isResizable) {
						obj.setDisplaySize(obj.displayWidth, obj.displayHeight)
					}
				})
			}
		})

		const { before, type } = this.transformControlsSnapshot
		this.transformControlsSnapshot = undefined

		const label = match(type)
			.with('rotate', () => 'Rotate')
			.with('resize', () => 'Resize')
			.with('origin', () => 'Change origin')
			.exhaustive()

		const after = this.captureSnapshot()
		void this.push(label, before, after)
	}

	private get undoHub() {
		return this.deps.scene.game.undoHub
	}
}
