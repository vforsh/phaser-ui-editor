export type FileTreeData = FileTreeItemData[]

export type FileTreeItemData =
	| { type: 'file'; name: string; path: string }
	| { type: 'folder'; name: string; path: string; children: FileTreeItemData[] }

export function findInFileTree(path: string, tree: FileTreeData): FileTreeItemData | undefined {
	for (const item of tree) {
		if (item.path === path) {
			return item
		}
		if (item.type === 'folder') {
			const found = findInFileTree(path, item.children)
			if (found) {
				return found
			}
		}
	}

	return undefined
}

/**
 * Removes an item from the file tree based on the given path.
 * **This function mutates the tree!**
 *
 * @param path - The path of the item to remove.
 * @param tree - The file tree data from which the item should be removed.
 * @returns `true` if the item was found and removed, `false` otherwise.
 */
export function removeFromFileTree(path: string, tree: FileTreeData): boolean {
	for (let i = 0; i < tree.length; i++) {
		const item = tree[i]
		if (item.path === path) {
			tree.splice(i, 1)
			return true
		}
		if (item.type === 'folder') {
			const removed = removeFromFileTree(path, item.children)
			if (removed) {
				return true
			}
		}
	}

	return false
}
