export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
	return handle.kind === 'file'
}

export function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
	return handle.kind === 'directory'
}

export async function findFileByName(
	directoryHandle: FileSystemDirectoryHandle,
	name: string
): Promise<FileSystemFileHandle | null> {
	for await (const handle of directoryHandle.values()) {
		if (isFileHandle(handle) && handle.name === name) {
			return handle
		} else if (isDirectoryHandle(handle)) {
			const file = await findFileByName(handle, name)
			if (file) {
				return file
			}
		}
	}

	return null
}

export async function findFileByPath(
	directoryHandle: FileSystemDirectoryHandle,
	path: string
): Promise<FileSystemFileHandle | null> {
	throw new Error('Not implemented')
}
