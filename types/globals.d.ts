import { Main } from '../Main'
import type {
	HierarchyNode,
	ControlInput,
} from '../src/control-rpc/contract'

declare global {
	interface Window {
		gameInstance: Main
		__Phaser3ExtensionsApplied: boolean
		editor?: {
			openProject(params: ControlInput<'open-project'>): Promise<void>
			openPrefab(params: ControlInput<'open-prefab'>): Promise<void>
			listHierarchy(): Promise<HierarchyNode>
			selectObject(params: ControlInput<'select-object'>): Promise<void>
			switchToContext(params: ControlInput<'switch-to-context'>): Promise<void>
			deleteObjects(params: ControlInput<'delete-objects'>): Promise<void>
		}
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
