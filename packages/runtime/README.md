# @tekton/runtime

Shared runtime primitives for Tekton Editor and Phaser games. This package starts with layout scheduling so games can reuse the same batched invalidation + flush behavior used in the editor, without depending on editor-only `EditableObject` classes.

## LayoutSystem (core)

`LayoutSystem` is framework-agnostic. You supply adapters for your container tree and layout components.

Example (Phaser):

```ts
import { LayoutSystem } from '@tekton/runtime'

const layoutSystem = new LayoutSystem({
	scheduleFlush: (flush) => {
		scene.events.once(Phaser.Scenes.Events.POST_UPDATE, flush)
	},
	isAlive: (container) => Boolean(container.scene),
	getChildren: (container) => container.list,
	getLayoutApplier: (child) => child.getData('layout') ?? null,
	logger: console,
})
```

Your layout applier should expose:

- `active: boolean`
- `apply(parent, logger)` returning `{ resizedContainer?: TContainer } | void`

`scheduleFlush` should only schedule one flush per frame. (The core system already de-duplicates, so calling it once per invalidation is fine.)

## Phaser auto-invalidation helper

For Phaser games that don’t have editor-style `size-changed` / `hierarchy-changed` events, use the opt-in helper:

```ts
import { installPhaserLayoutAutoInvalidation } from '@tekton/runtime/phaser/layout'

const { uninstall } = installPhaserLayoutAutoInvalidation(rootContainer, {
	invalidate: (container) => layoutSystem.invalidate(container),
})

scene.events.once(Phaser.Scenes.Events.SHUTDOWN, uninstall)
```

What it patches:

- `add`, `addAt`, `remove`, `removeAll` (hierarchy changes)
- `setSize` (size changes)

Caveats:

- It won’t catch direct mutations like `container.list.push(...)`.
- If your game already centralizes prefab mutations, explicit `layoutSystem.invalidate(...)` calls can be simpler.

## Contract types

Prefab JSON types and component JSON types are exported directly from this package (e.g. `PrefabFile`, `EditableObjectJson`, layout component JSON unions). Import types from `@tekton/runtime` instead of the repo-root `exports.d.ts`.
