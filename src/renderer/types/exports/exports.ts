/**
 * Public type exports entrypoint.
 *
 * This file defines the **small, stable, public TypeScript surface area** that other projects can
 * depend on (primarily the prefab JSON types like `PrefabFile`, `EditableObjectJson`, etc.).
 *
 * It is intentionally limited/curated to avoid exporting internal editor implementation details.
 *
 * ### Why relative imports (no path aliases)
 * The declarations are bundled into a single repo-root `exports.d.ts` (see `npm run build-types`).
 * Because the output is meant to be consumed as a standalone `.d.ts` by downstream projects,
 * imports must remain **resolvable for consumers** — so we use **relative paths** and avoid TS
 * path aliases like `@components/*`.
 */

import { EditableComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { GridLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/GridLayoutComponent'
import { HorizontalLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/HorizontalLayoutComponent'
import { VerticalLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/VerticalLayoutComponent'
import { EditableBitmapTextJson } from '../../components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJson } from '../../components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJson } from '../../components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableNineSliceJson } from '../../components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { EditableObjectJson } from '../../components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableTextJson } from '../../components/canvas/phaser/scenes/main/objects/EditableText'
import { CanvasDocumentJson, NodeAddress, PrefabInstanceJson, PrefabOverrides } from '../prefabs/PrefabDocument'
import { PrefabFile } from '../prefabs/PrefabFile'

export type {
	EditableBitmapTextJson,
	EditableComponentJson,
	EditableContainerJson,
	EditableImageJson,
	EditableNineSliceJson,
	EditableObjectJson,
	EditableTextJson,
	GridLayoutComponentJson,
	HorizontalLayoutComponentJson,
	CanvasDocumentJson,
	NodeAddress,
	PrefabInstanceJson,
	PrefabOverrides,
	PrefabFile,
	VerticalLayoutComponentJson,
}
