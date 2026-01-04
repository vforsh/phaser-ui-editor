/**
 * Logical areas the global undo system can affect.
 * - `canvas`: prefab document edits (snapshot-based today)
 * - `assets`: filesystem-backed assets tree edits (op/inverse-based)
 */
export type HistoryDomain = 'canvas' | 'assets'

/**
 * One undoable user action in the global chronological timeline.
 *
 * Notes:
 * - `undo`/`redo` may be async (e.g. filesystem operations).
 * - `isValid` gates whether the entry can apply in the current app context
 *   (e.g. after project/prefab switches).
 */
export type HistoryEntry = {
	label: string
	domains: HistoryDomain[]
	timestamp: number
	isValid: () => boolean
	undo: () => Promise<void> | void
	redo: () => Promise<void> | void
}

/**
 * Minimal UI-facing state for enabling/disabling controls and showing labels.
 */
export type HistoryState = {
	canUndo: boolean
	canRedo: boolean
	undoLabel?: string
	redoLabel?: string
	length: number
}

/**
 * UndoHub integration hooks.
 */
type UndoHubOptions = {
	onChange?: (state: HistoryState) => void
}

/**
 * Represents an in-progress transaction, created by `begin()` and completed by `commit()`.
 * The builder produces the final history entry when committed.
 */
type PendingTransaction = {
	build: () => HistoryEntry | Promise<HistoryEntry>
}

/**
 * Global undo/redo stack.
 * This is intentionally minimal; recording is left to callers.
 */
export class UndoHub {
	private undoStack: HistoryEntry[] = []
	private redoStack: HistoryEntry[] = []
	private isApplying = false
	private onChange: (state: HistoryState) => void
	private pendingTransaction: PendingTransaction | null = null

	constructor(options: UndoHubOptions = {}) {
		this.onChange = options.onChange ?? (() => {})
	}

	public setOnChange(cb: (state: HistoryState) => void) {
		this.onChange = cb
		this.emitChange()
	}

	public push(entry: HistoryEntry) {
		if (this.isApplying) {
			return
		}

		this.undoStack.push(entry)
		this.redoStack = []
		this.emitChange()
	}

	public begin(build: () => HistoryEntry | Promise<HistoryEntry>) {
		this.pendingTransaction = { build }
	}

	public async commit() {
		if (!this.pendingTransaction) {
			return
		}

		const entry = await this.pendingTransaction.build()
		this.pendingTransaction = null
		this.push(entry)
	}

	public cancel() {
		this.pendingTransaction = null
	}

	public async transaction<T>(build: () => HistoryEntry | Promise<HistoryEntry>, fn: () => T | Promise<T>): Promise<T> {
		this.begin(build)
		const result = await fn()
		await this.commit()
		return result
	}

	public async undo() {
		if (this.isApplying) {
			return
		}

		while (this.undoStack.length > 0) {
			const entry = this.undoStack.pop()!
			if (!entry.isValid()) {
				continue
			}

			this.isApplying = true
			try {
				await entry.undo()
				this.redoStack.push(entry)
			} finally {
				this.isApplying = false
				this.emitChange()
			}
			break
		}
	}

	public async redo() {
		if (this.isApplying) {
			return
		}

		while (this.redoStack.length > 0) {
			const entry = this.redoStack.pop()!
			if (!entry.isValid()) {
				continue
			}

			this.isApplying = true
			try {
				await entry.redo()
				this.undoStack.push(entry)
			} finally {
				this.isApplying = false
				this.emitChange()
			}
			break
		}
	}

	public clear() {
		this.undoStack = []
		this.redoStack = []
		this.emitChange()
	}

	public get state(): HistoryState {
		const nextUndo = this.peekValid(this.undoStack)
		const nextRedo = this.peekValid(this.redoStack)

		return {
			canUndo: Boolean(nextUndo),
			canRedo: Boolean(nextRedo),
			undoLabel: nextUndo?.label,
			redoLabel: nextRedo?.label,
			length: this.undoStack.length,
		}
	}

	private emitChange() {
		this.onChange(this.state)
	}

	private peekValid(stack: HistoryEntry[]): HistoryEntry | undefined {
		for (let i = stack.length - 1; i >= 0; i -= 1) {
			const entry = stack[i]
			if (entry.isValid()) {
				return entry
			}
		}

		return undefined
	}
}
