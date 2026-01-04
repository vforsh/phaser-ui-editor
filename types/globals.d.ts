import type { WindowEditorApi } from '../src/control-rpc/expose-window-editor'
import type { MainApi } from '../src/shared/main-api/MainApi'

import { Main } from '../Main'

declare global {
	interface Window {
		mainApi?: MainApi
		gameInstance: Main
		__Phaser3ExtensionsApplied: boolean
		appMenu?: {
			onTakeCanvasScreenshot: (callback: (payload: { clean?: boolean }) => void) => () => void
			onOpenSettings: (
				callback: (payload: { section?: 'general' | 'hierarchy' | 'canvas' | 'assets' | 'inspector' | 'dev' | 'misc' }) => void,
			) => () => void
			onTogglePanel: (callback: (payload: { panel: 'hierarchy' | 'assets' | 'inspector' }) => void) => () => void
		}
		editor?: WindowEditorApi
		/**
		 * Displays a directory picker which allows the user to select a directory.
		 * @returns A promise that resolves with a FileSystemDirectoryHandle object representing the selected directory.
		 * @link https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
		 */
		showDirectoryPicker: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>
	}

	type DirectoryPickerOptions = {
		id?: string
		mode?: 'read' | 'readwrite'
		startIn?: FileSystemHandle
	}

	interface FileSystemDirectoryHandle {
		values: () => AsyncIterable<FileSystemHandle>
		keys: () => AsyncIterable<string>
		entries: () => AsyncIterable<[string, FileSystemHandle]>
	}

	interface Array<T> {
		at(index: number): T | undefined
	}

	interface ReadonlyArray<T> {
		at(index: number): T | undefined
	}
}
