import { Main } from '../Main'
import type {
	DeleteObjectsParams,
	HierarchyNode,
	IdOrPathParams,
	OpenPrefabParams,
	OpenProjectParams,
} from '../src/control-rpc/rpc'

declare global {
	interface Window {
		gameInstance: Main
		__Phaser3ExtensionsApplied: boolean
		editor?: {
			openProject(params: OpenProjectParams): Promise<void>
			openPrefab(params: OpenPrefabParams): Promise<void>
			listHierarchy(): Promise<HierarchyNode>
			selectObject(params: IdOrPathParams): Promise<void>
			switchToContext(params: IdOrPathParams): Promise<void>
			deleteObjects(params: DeleteObjectsParams): Promise<void>
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
