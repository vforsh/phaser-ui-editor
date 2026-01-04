import { useEffect } from 'react'

import type { UndoHub } from '../history/UndoHub'

export type UseGlobalUndoRedoShortcutsOptions = {
	undoHub: UndoHub
}

/**
 * Registers global undo/redo shortcuts on `window`.
 *
 * - Undo: `Cmd/Ctrl + Z`
 * - Redo: `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y`
 *
 * Guard: if focus is inside an input/textarea/contentEditable element, does nothing.
 */
export function useGlobalUndoRedoShortcuts({ undoHub }: UseGlobalUndoRedoShortcutsOptions): void {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const activeElement = document.activeElement
			const isInputFocused =
				activeElement instanceof HTMLElement &&
				(activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)

			if (isInputFocused) {
				return
			}

			const isModifierPressed = event.metaKey || event.ctrlKey
			if (!isModifierPressed) {
				return
			}

			const key = event.key.toLowerCase()
			if (key === 'z' && !event.shiftKey) {
				event.preventDefault()
				void undoHub.undo()
				return
			}

			if (key === 'y' || (key === 'z' && event.shiftKey)) {
				event.preventDefault()
				void undoHub.redo()
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [undoHub])
}
