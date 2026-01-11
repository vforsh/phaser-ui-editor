export type LayoutAutoInvalidationOptions = {
	invalidate: (container: Phaser.GameObjects.Container) => void
	shouldWatch?: (container: Phaser.GameObjects.Container) => boolean
}

type Container = Phaser.GameObjects.Container

type Originals = {
	add: Container['add']
	addAt: Container['addAt']
	remove: Container['remove']
	removeAll: Container['removeAll']
	setSize: Container['setSize']
}

export function installPhaserLayoutAutoInvalidation(
	root: Phaser.GameObjects.Container,
	options: LayoutAutoInvalidationOptions,
): { uninstall(): void } {
	if (!root.scene || !root.active) {
		return { uninstall: () => {} }
	}

	const originalsByContainer = new WeakMap<Container, Originals>()
	const watchedContainers = new Set<Container>()
	const shouldWatch = options.shouldWatch ?? (() => true)

	const watchContainer = (container: Container): void => {
		if (!container.scene || !container.active) {
			return
		}

		if (!shouldWatch(container)) {
			return
		}

		if (originalsByContainer.has(container)) {
			return
		}

		const originals: Originals = {
			add: container.add,
			addAt: container.addAt,
			remove: container.remove,
			removeAll: container.removeAll,
			setSize: container.setSize,
		}

		originalsByContainer.set(container, originals)
		watchedContainers.add(container)

		container.add = function add(this: Container, child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) {
			const result = originals.add.call(this, child)
			for (const added of normalizeChildren(child)) {
				if (added instanceof Phaser.GameObjects.Container) {
					watchContainer(added)
				}
			}
			options.invalidate(this)
			return result
		}

		container.addAt = function addAt(
			this: Container,
			child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
			index?: number,
		) {
			const result = originals.addAt.call(this, child, index as number)
			for (const added of normalizeChildren(child)) {
				if (added instanceof Phaser.GameObjects.Container) {
					watchContainer(added)
				}
			}
			options.invalidate(this)
			return result
		}

		container.remove = function remove(
			this: Container,
			child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
			destroyChild?: boolean,
		) {
			const removed = normalizeChildren(child)
			const result = originals.remove.call(this, child, destroyChild as boolean)
			for (const item of removed) {
				if (item instanceof Phaser.GameObjects.Container) {
					if (!isUnderRoot(root, item)) {
						unwatchSubtree(item)
					}
				}
			}
			options.invalidate(this)
			return result
		}

		container.removeAll = function removeAll(this: Container, destroyChild?: boolean) {
			const removed = [...this.list]
			const result = originals.removeAll.call(this, destroyChild as boolean)
			for (const item of removed) {
				if (item instanceof Phaser.GameObjects.Container) {
					if (!isUnderRoot(root, item)) {
						unwatchSubtree(item)
					}
				}
			}
			options.invalidate(this)
			return result
		}

		container.setSize = function setSize(this: Container, width: number, height: number) {
			const result = originals.setSize.call(this, width, height)
			options.invalidate(this)
			return result
		}

		for (const child of container.list) {
			if (child instanceof Phaser.GameObjects.Container) {
				watchContainer(child)
			}
		}
	}

	const unwatchContainer = (container: Container): void => {
		const originals = originalsByContainer.get(container)
		if (!originals) {
			return
		}

		container.add = originals.add
		container.addAt = originals.addAt
		container.remove = originals.remove
		container.removeAll = originals.removeAll
		container.setSize = originals.setSize

		originalsByContainer.delete(container)
		watchedContainers.delete(container)
	}

	const unwatchSubtree = (container: Container): void => {
		unwatchContainer(container)
		for (const child of container.list) {
			if (child instanceof Phaser.GameObjects.Container) {
				unwatchSubtree(child)
			}
		}
	}

	watchContainer(root)

	return {
		uninstall: () => {
			for (const container of watchedContainers) {
				unwatchContainer(container)
			}
			watchedContainers.clear()
		},
	}
}

function normalizeChildren(child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
	return Array.isArray(child) ? child : [child]
}

function isUnderRoot(root: Container, container: Container): boolean {
	if (root === container) {
		return true
	}

	let current: Phaser.GameObjects.Container | null = container.parentContainer
	while (current) {
		if (current === root) {
			return true
		}
		current = current.parentContainer
	}

	return false
}
