import { Main } from '../Main'

declare global {
	// whether we are in bolt.dev environment or not
	let BOLT: boolean

	interface Window {
		gameInstance: Main
		__Phaser3ExtensionsApplied: boolean
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
		at(index: number): T
	}
}
