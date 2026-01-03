### External RPC: full control over Canvas / Phaser objects (proposal)

This document captures a proposed expansion to the control-RPC contract (`src/control-rpc/contract.ts`) to provide **full external control** over:

- The editor canvas (Phaser `MainScene` + `PhaserApp`)
- Canvas objects (create/select/move/delete, update props, manage components)
- Prefab lifecycle (open/save/discard)
- Camera + view navigation

It is designed to align with existing internal command surfaces:

- Internal command bus: `src/AppCommands.ts`
- Canvas command handlers: `src/components/canvas/phaser/scenes/main/MainScene.ts` (`setupAppCommands`)
- Existing external RPC docs: `docs/features/editorctl/editor-control.md`

---

### Goals

- **Mirror** existing internal `AppCommands` into external RPC methods (fast, low-risk).
- Add a few **missing primitives** required for *true* “full control”:
  - Read object JSON/state
  - Patch object state (generic, path-based)
  - Camera control

---

### A. Mirror existing canvas commands (1:1 with `AppCommands`)

These methods already exist internally and are handled inside `MainScene.setupAppCommands()` (or `PhaserApp`), so external RPC can primarily be a thin bridge.

#### Selection

- **`select-objects`**
  - **input**: `{ ids: string[] }`
  - **output**: `{ success: true }`
- **`add-object-to-selection`**
  - **input**: `{ id: string }`
  - **output**: `{ success: true }`
- **`remove-object-from-selection`**
  - **input**: `{ id: string }`
  - **output**: `{ success: true }`
- **`clear-selection`**
  - **input**: `{}`
  - **output**: `{ success: true }`

#### Hierarchy / object ops

- **`highlight-object`**
  - **input**: `{ id: string }`
  - **output**: `{ success: true }`
- **`create-object`**
  - **input**: `{ clickedObjId: string; type: 'Container' | 'Image' | 'Text' | 'BitmapText' | 'NineSlice' }`
  - **output (recommended)**: `{ id: string }`
  - Note: currently only `'Container'` is created in `MainScene.createObject` (others return `null`).
- **`duplicate-object`**
  - **input**: `{ id: string }`
  - **output (recommended)**: `{ id: string }` (new object id)
- **`move-object-in-hierarchy`**
  - **input**: `{ id: string; parentId: string; parentIndex: number }`
  - **output**: `{ success: true }`
- **`get-object-path`**
  - **input**: `{ id: string }`
  - **output**: `{ path: string }`

#### Prefab lifecycle / history

- **`save-prefab`**
  - **input**: `{}`
  - **output (recommended)**: `{ ok: true } | { ok: false; error: string }`
  - Note: `MainScene.savePrefab()` already returns `Result<void, string>`, but `AppCommands` currently types `'save-prefab'` as `() => void`.
- **`discard-unsaved-prefab`**
  - **input**: `{}`
  - **output**: `{ success: true }`
- **`undo`**
  - **input**: `{}`
  - **output**: `{ success: true }`
- **`redo`**
  - **input**: `{}`
  - **output**: `{ success: true }`

#### Assets → canvas

`AppCommands` exposes `'handle-asset-drop'` which can create objects from assets.

- **`create-from-asset`** (wrapper around `'handle-asset-drop'`)
  - **input**:
    - `{ assetId: string; position: { x: number; y: number } }`
    - or `{ assetPath: string; position: { x: number; y: number } }`
  - **output (recommended)**: `{ id: string }` (created object id)

#### Align helpers

Align types come from `src/components/canvas/phaser/scenes/main/Aligner.ts`:

`'top' | 'vertical-center' | 'bottom' | 'distribute-vertical' | 'left' | 'horizontal-center' | 'right' | 'distribute-horizontal'`

- **`align`**
  - **input**: `{ type: <AlignType> }`
  - **output**: `{ success: true }`

#### Inspector helpers

- **`reset-image-original-size`**
  - **input**: `{ objectId: string }`
  - **output**: `{ success: true }`
- **`adjust-container-to-children-bounds`**
  - **input**: `{ objectId: string }`
  - **output**: `{ success: true }`

#### Components (Inspector-level control)

Editable component types currently include:

- `'horizontal-layout' | 'vertical-layout' | 'grid-layout' | 'layout' | 'localization' | 'input'`

Recommended result type (align with internal `neverthrow` results):

- `{ ok: true } | { ok: false; error: string }`

Methods:

- **`add-component`** `{ objectId: string; componentType: EditableComponentType }`
- **`remove-component`** `{ objectId: string; componentType: EditableComponentType }`
- **`move-component-up`** `{ objectId: string; componentType: EditableComponentType }`
- **`move-component-down`** `{ objectId: string; componentType: EditableComponentType }`
- **`paste-component`** `{ objectId: string; componentData: EditableComponentJson }`

All: **output** is the recommended `{ ok:true } | { ok:false; error:string }` union.

---

### B. Missing primitives for true “full control”

The following are not currently exposed via `AppCommands`, but they unlock a complete external control story without adding a dedicated RPC method for every property.

#### Read object data

- **`get-object`**
  - **input**: `{ id: string } | { path: string }`
  - **output**: `EditableObjectJson` (or `{ object: EditableObjectJson }`)
- **`get-prefab-content`**
  - **input**: `{}`
  - **output**: `EditableContainerJson` (full root JSON)
- **`get-canvas-state`**
  - **input**: `{}`
  - **output**:
    - `{ currentPrefab?: { id: string; name: string } }`
    - `{ activeContextId?: string }`
    - `{ selectionIds: string[] }`
    - `{ hasUnsavedChanges: boolean }`
    - `{ camera: { zoom: number; scrollX: number; scrollY: number } }`

#### Patch object state (generic)

Proposed method:

- **`patch-object`**
  - **input**:
    - `{ id: string; ops: Array<{ op: 'set' | 'unset'; path: string; value?: unknown }> }`
  - **output**: `{ success: true }`

Rationale:

- Each editable object holds a Valtio `stateObj`, and `StateChangesEmitter` already maps many dot-paths
  (e.g. `x`, `y`, `scale.x`, `text`, `originX`, `tint`, `width/height` on containers/nine-slice, etc.)
  into mutations on the live Phaser object.

#### Camera control

- **`set-camera`**
  - **input**: `{ zoom?: number; scrollX?: number; scrollY?: number }`
  - **output**: `{ success: true }`

Optional follow-ups:

- `frame-selection` / `frame-context` → `{ success: true }`

---

### C. Commands to defer (not implemented internally yet)

These exist in `AppCommands` but are TODO/no-op in the canvas implementation currently, so exposing them externally would be misleading:

- `copy-object`
- `cut-object`
- `paste-object`

Recommendation: implement them in `MainScene` first, then add to the external contract.

---

### Implementation notes (where each piece should land)

When implementing, follow the existing flow described in `docs/features/editorctl/editor-control.md`:

- Add method + Zod schemas in `src/control-rpc/contract.ts`
- Implement behavior in `src/control-rpc/EditorControlService.ts` (guard clauses, translate to internal commands)
- Wire method in `src/control-rpc/renderer-rpc.ts` (`match().exhaustive()`)
- (Optional) expose in `src/control-rpc/expose-window-editor.ts` and typings in `types/globals.d.ts`
- Add `editorctl` CLI command under `scripts/editorctl/commands/` and register it

---

### Suggested rollout (v1)

Minimal set that still enables full automation:

- Read: `get-canvas-state`, `get-object`, `get-prefab-content`
- Write: `patch-object`
- Core ops: `select-objects`, `switch-to-context` (already exists), `delete-objects`, `move-object-in-hierarchy`
- Lifecycle: `open-project`, `open-prefab`, `save-prefab`
- Camera: `set-camera`

