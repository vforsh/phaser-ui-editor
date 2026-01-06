# Prefab System w/ Nested Prefabs + In-Place Editing (Hierarchy-Locked) — Implementation Plan

This plan adapts the prefab design in `~/Downloads/prefab_system_with_in_place_editing.md` to this editor’s current architecture:

- **Runtime is the model** today: `MainScene` constructs Phaser `Editable*` objects and Valtio state (`EditableContainer.stateObj`) and uses `root.toJson()` for snapshots/undo/save.
- **Prefab file** today: `PrefabFile = { content: EditableContainerJson | null, assetPack: PackFileSection[] }` (`src/renderer/types/prefabs/PrefabFile.ts`).
- **Prefab “instance” today**: dropping a prefab asset loads its `PrefabFile.content`, sets `prefab: {id,name}` on the root container JSON, and instantiates it via `EditableObjectsFactory.fromJson()` (`MainScene` around the `handle-asset-drop` path). There is no nested-prefab metadata beyond that marker.
- **Critical constraint**: object `id` is **not stable across load**. `EditableObjectsFactory.fromJson()` generates fresh ids and ignores `json.id`, so ids are **runtime-only** today.

We want:

- Nested prefabs (prefab-in-prefab)
- In-place editing of nested internals (no mode; **implicit** selection-based editing)
- Overrides at any nesting depth
- **Strict hierarchy locking** for prefab instances (no add/remove/reorder/reparent, plus you confirmed: **no rename/duplicate** either)
- Skip apply/revert UX for now

---

## Goals + non-goals (v1)

### Goals

- **Prefab instances resolve to real runtime objects** so selection/inspector/transform work as-is.
- **Edits to nodes inside prefab instances persist** via overrides, not by mutating prefab asset files.
- **Nested prefabs supported** (Prefab A contains Prefab B instance).
- **Hierarchy locking enforced** for any node under a prefab instance (including nested).

### Non-goals (explicit)

- Apply/Revert UI and “apply to prefab” workflows.
- Structural overrides (add/remove/reorder/reparent).
- Variants/exposed parameters.

---

## Key architectural decision: introduce stable template identity separate from runtime id

Today, `EditableObjectJson.id` exists but is effectively ignored on load; runtime ids are regenerated. For prefab overrides we need a stable identifier for template nodes.

### Proposal

- Keep current **runtime `id`** behavior for selection, object lookup, undo context switching, etc.
- Add a new **stable** field to JSON and state:
    - `localId: string` on every `EditableObjectJson` (including `EditableContainerJson` and leaf objects).
    - This `localId` is stable across save/load and is **never reused** within a single prefab asset.

Why this fits the current app:

- UI and commands keep using `id` (runtime id).
- Prefab addressing + override targeting uses `localId` (template id).

---

## Data model changes

### 1) Node addressing across prefab layers

Define a prefab-aware address that does not depend on runtime ids, names, or indices.

Recommended shape (adapted from the doc):

- `NodeAddress = Array<{ kind: "local"; localId: string } | { kind: "nestedPrefab"; prefabId: string }>`

Address example:

- `[{kind:"local", localId:"HUDRoot"}, {kind:"nestedPrefab", prefabId:"AmmoWidget"}, {kind:"local", localId:"TextCount"}]`

### 2) Override representation

We’ll store overrides on the nearest prefab instance node.

Minimal v1 override types:

- **Object patch override**: patch subset of `EditableObjectJson` fields (transform/visual/layout/etc.)
- **Component patch override**: patch subset of component state by component id (component ids already preserve from JSON via `EditableComponentsFactory.getOrCreateId(initialState)`).

Suggested types (new under `src/renderer/types/prefabs/`):

- `PrefabOverrides`:
    - `objects: Array<{ target: NodeAddress; patch: PartialEditableObjectPatch }>`
    - `components: Array<{ target: NodeAddress; componentId: string; patch: Record<string, unknown> }>`

Where `PartialEditableObjectPatch` is explicitly whitelisted (avoid writing runtime-only stuff):

- Allowed: `name?`, `visible?`, `locked?`, `x?`, `y?`, `rotation?`, `angle?`, `scale?`, `alpha?`, `originX?`, `originY?`, `width?`, `height?`, `depth?`, `blendMode?`, plus object-type-specific whitelisted props.
- Not allowed: `id` (runtime), `children` (structural), `prefab*` metadata, transient Phaser fields, etc.

### 3) Nested prefab node type in saved JSON

You chose: represent nesting explicitly as a special node type.

Add a new `EditableObjectJson` variant:

- `PrefabInstanceJson`:
    - `type: "PrefabInstance"`
    - `localId: string`
    - `prefabRef: { id: string; name: string }` (use existing `PrefabRef` shape)
    - `overrides: PrefabOverrides`
    - plus container-like editable fields (position/scale/size/etc.) if we want instance root transformable
    - **no `children`** in the serialized form (children are resolved from the referenced prefab template)

Runtime representation:

- Use an `EditableContainer` instance for the prefab instance root (so selection, sizing, layout work), but it should carry additional metadata to indicate it’s a prefab instance and to drive resolution/collapse.

---

## Runtime resolution model (expand for editing, collapse for persistence)

We need to reconcile two truths:

- Editor wants expanded runtime children so users can select nested nodes.
- Prefab instance JSON should not store children (hierarchy-locked template-driven).

### Resolution pipeline (load/open)

When opening a prefab file into `MainScene`:

1. Parse `PrefabFile.content` (root JSON).
2. Convert JSON into a **document model** (see next section) that includes `PrefabInstanceJson` nodes.
3. Expand the document model into runtime `Editable*` objects:
    - For normal nodes: instantiate directly via `EditableObjectsFactory`.
    - For `PrefabInstanceJson`:
        - Load referenced prefab asset’s `PrefabFile.content` (template root).
        - Ensure template has `localId`s (migration/upgrade step).
        - Recursively resolve nested prefabs inside that template.
        - Apply the instance’s overrides (top-down).
        - Instantiate the resolved children as runtime objects under the prefab-instance root container.

### Serialization pipeline (save/snapshots/undo)

We should not rely on `root.toJson()` anymore once prefab instances exist, because that will include expanded children and will “bake” instance edits into the saved file.

Instead:

- Introduce a “document serializer”:
    - `serializeDocument(rootRuntime): EditableContainerJsonDocument`
    - It traverses runtime objects and produces a JSON tree where:
        - Normal containers include explicit `children`.
        - Prefab instance nodes are **collapsed** back to `PrefabInstanceJson` without children; overrides are regenerated from the runtime expanded state (see “override generation” below).

### Override generation strategy (v1)

Since you’re skipping apply/revert for now, the simplest robust strategy is:

- Treat the referenced prefab template as the baseline.
- For each resolved runtime node under a prefab instance, compute the patch needed to transform baseline → runtime.
- Emit those diffs as overrides in `PrefabInstanceJson.overrides`.

Important: this must be deterministic so undo/snapshots behave.

Implementation detail:

- Build a map from `localId` address → baseline node JSON (after nested resolution but **before** applying instance overrides).
- Build a map from `localId` address → runtime node JSON (from runtime objects, but with runtime-only fields stripped).
- Diff whitelisted fields and emit patch overrides only when different.

---

## Document model + undo integration (critical)

Today:

- Undo snapshots capture `{ rootJson: root.toJson(), activeContextId: runtimeId, selectionIds: runtimeIds }`.
- Applying snapshot destroys the runtime root and rehydrates via `objectsFactory.fromJson(snapshot.rootJson)`.

With prefab instances, `root.toJson()` becomes the expanded view, not a persistable model.

### Proposal: split “Document JSON” from “Runtime JSON”

Add a document-level JSON type (under `src/renderer/types/prefabs/` or `src/renderer/types/canvas/`):

- `CanvasDocumentJson` (root is still container-like), but the union includes `PrefabInstanceJson`.

Then change:

- `captureSnapshot()` to store:
    - `documentJson` (collapsed form)
    - runtime selection ids (still runtime ids)
    - active context runtime id
    - camera
- `applySnapshot()` to:
    - rebuild runtime from `documentJson` through the new resolver/expander
    - then restore selection/context using runtime ids (best-effort; for v1, selection restore may clear if ids change)

### Optional improvement (recommended)

To make selection stable across undo/redo despite regenerated runtime ids:

- Add `localId` (stable) to all runtime objects, and store selection by `NodeAddress` (or localId + context address) in snapshots.
- On snapshot apply, re-select by localId address mapping.

This is not strictly required to ship v1 prefab overrides, but it will improve UX and reduce “selection lost on undo”.

---

## Hierarchy locking enforcement (strict)

You want “yes to all”: block:

- add child
- remove child
- reorder
- reparent
- rename
- duplicate

Where these operations are initiated today:

- `MainScene` app command handlers:
    - `create-object`, `duplicate-object`, `delete-objects`, `move-object-in-hierarchy`
- Hierarchy panel rename flow (React side) calls an app command/event to apply rename (needs pinpointing in code; implement guard where rename is committed).

### Lock rule

If an operation would change structure or identity under a prefab instance:

- Block it and show a warning notification.

Concrete guard conditions (return early):

- **Create**: if target parent is inside a prefab instance → block
- **Delete**: if any target object is inside a prefab instance → block
- **Duplicate**: if target object is inside a prefab instance → block
- **Move/reparent/reorder**: if source or destination is inside a prefab instance → block
- **Rename**: if target is inside a prefab instance → block

Implementation approach:

- Add a helper:
    - `getPrefabLockContext(obj: EditableObject): PrefabLockInfo | null`
    - It returns nearest containing `PrefabInstance` root + the `NodeAddress` for the object.
- Gate the structural commands in `MainScene` using this helper.

---

## How to represent prefab ancestry on runtime objects

To support:

- mapping runtime object → `NodeAddress`
- lock checks
- override generation

Add non-serialized runtime metadata to `EditableObject` implementations:

- `prefabMeta?: { instanceRootRuntimeId: string; address: NodeAddress }`

Where:

- `instanceRootRuntimeId` identifies the closest prefab instance root in the runtime tree.
- `address` identifies the node within nested prefab layers (stable).

This metadata is populated by the resolver during expansion.

---

## File format migration / compatibility

Existing prefab files are `PrefabFile` where `content` is an `EditableContainerJson` tree with children and no `localId`.

### Migration strategy

On load:

- If `localId` is missing on any node:
    - Assign new `localId`s deterministically (preorder traversal; generate ids; ensure uniqueness).
    - Mark document “dirty” so a subsequent save upgrades the file.

On save:

- Always write `localId` for all nodes.
- If no prefab instances exist, output remains mostly the same with added `localId` fields.

Validation:

- Add Zod schemas for `PrefabFile` and for `CanvasDocumentJson` to reject malformed prefab content early (TODOs already note this in code).

---

## Integration points in current codebase

### Prefab open/save entrypoints

- Load: `PhaserApp.openPrefab()` reads JSON via `mainApi.readJson` and starts `MainScene`.
- Instantiate runtime: `MainScene.initRoot(prefabFile)` currently calls `objectsFactory.fromJson(prefabFile.content, true)`.
- Save: `MainScene.savePrefab()` writes `PrefabFile` with `content: root.toJson()`.

Plan changes:

- Replace `objectsFactory.fromJson(prefabFile.content)` with “document expander”:
    - `expandDocumentToRuntime(prefabFile.content, { project/assets access })`
- Replace `root.toJson()` on save with:
    - `serializeRuntimeToDocument(rootRuntime)`

### Prefab as droppable asset (nested prefabs)

Currently when handling asset drop of type `prefab`, code:

- reads nested prefab file
- creates `containerJson = { ...prefabFile.content, prefab: { id, name } }`
- instantiates via `fromJson`

Plan changes:

- Dropping a prefab should create a `PrefabInstanceJson` node instead (no children in document).
- Runtime expansion happens automatically via the resolver.

---

## Public type exports (`exports.d.ts`) — keep downstream consumers working

This repo has an explicit public type surface area under `src/renderer/types/exports/exports.ts` that is bundled into repo-root `exports.d.ts` (see comment in that file).

When implementing the prefab system, **any new JSON types that downstream projects should consume** must be added there using **relative imports** (no path aliases). Keep it minimal/curated.

Recommended exports for this feature (only if actually used by consumers):

- `PrefabInstanceJson`
- `NodeAddress`
- `PrefabOverrides` (and its leaf types)
- The new top-level document union/root type (e.g. `CanvasDocumentJson` or whatever we name the “collapsed” JSON)

Do **not** export internal runtime-only helper types (resolver caches, runtime `prefabMeta`, editor-only services, etc.).

---

## Phased rollout plan (recommended milestones)

### Milestone A — Stable `localId` groundwork

- Add `localId` to `EditableObjectJson` (all variants).
- Ensure new objects get a `localId` at creation time (create/duplicate/import).
- Ensure `fromJson` preserves `localId` from JSON (while still generating runtime `id`).
- Add helpers:
    - `createLocalId()`
    - `ensureLocalIds(tree)` (migration)
- Add Zod validation for existing prefab files (optional but recommended).

Exit criteria:

- Saving a prefab produces JSON with `localId` everywhere.
- Loading preserves `localId`.
- No behavior change for users yet (no prefab instances).

### Milestone B — Introduce `PrefabInstanceJson` in document model

- Extend JSON union to include `{ type: "PrefabInstance", prefabRef, overrides, ... }`.
- Update asset-drop “prefab” creation to create this node (document-level).
- Update hierarchy rendering to show prefab instance nodes distinctly (icon/label).

Exit criteria:

- Document can represent nested prefab nodes.
- Runtime can still render them (even if expansion is stubbed initially).

### Milestone C — Resolver/expander (nested prefabs + override application)

- Implement resolver that:
    - Loads referenced prefab content on demand
    - Expands nested prefabs recursively
    - Applies overrides
    - Instantiates expanded runtime objects under the instance root
    - Sets `prefabMeta` (`NodeAddress`) on all expanded runtime nodes
- Add caching for loaded prefab templates to avoid repeated disk reads.

Exit criteria:

- Dropping a prefab creates an instance that visually matches the referenced prefab.
- Selecting and editing nested nodes works (in-place).

### Milestone D — Collapse + override generation (persistence)

- Implement serializer that collapses runtime expanded prefab instances back to `PrefabInstanceJson`.
- Implement diff/patch generation for overrides:
    - Object patches
    - Component patches
- Wire save path to write collapsed document JSON.
- Wire unsaved-change detection to compare collapsed document JSON to baseline.

Exit criteria:

- Editing a nested node, saving, reopening → changes persist via overrides.
- Prefab asset file itself is unchanged (only instance overrides stored in the parent).

### Milestone E — Strict hierarchy locking

- Add guard checks in `MainScene` structural command handlers:
    - create/duplicate/delete/move/reparent/rename
- Add clear warning UX (notification) explaining “Prefab instance hierarchy is locked”.

Exit criteria:

- All forbidden actions are blocked anywhere under prefab instances, including nested.

---

## Testing strategy (manual + automation)

### Manual checklist

- Create Prefab A with nested Prefab B instance; open A.
- Select node inside B (in-place) and edit transform/size/component state.
- Confirm you can still select/edit nodes outside the instance.
- Attempt forbidden ops inside B: create child, delete, move, rename, duplicate → blocked.
- Save A, reload A → edits persist.

### Editorctl-based smoke tests (optional, but recommended later)

- Add `editorctl` scripts to:
    - open prefab
    - create prefab instance node
    - set a property on a deeply nested node
    - trigger save
    - reopen and assert JSON contains override entries

---

## Notes on `PrefabFile.assetPack`

Current status:

- `MainScene.calculatePrefabAssetPack()` returns `[]` and is marked TODO; comment says it’s for runtime, not editor.

Plan:

- Asset pack generation is now tracked as a dedicated plan doc: `tasks/impl-plan-prefab-asset-pack.md`.
- Prefab in-place editing work can continue to rely on editor-side asset loading (`MainSceneAssetLoader.loadPrefabAssets` / `calculatePrefabAssets`).

---

## “Done” checklist after implementation (repo rule)

After implementing this feature and before merging:

1. Run oxfmt on changed/added files:

```bash
npx oxfmt --write $(git diff --name-only --diff-filter=AM)
```

2. Run typecheck:

```bash
npm run typecheck
```

3. Run lint auto-fix (and then fix remaining issues):

```bash
npm run lint:fix
```
