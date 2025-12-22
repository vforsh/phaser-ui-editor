# Undo/Redo implementation plan (Canvas + Assets, global timeline)

## Goal

Add **Undo** and **Redo** support for *all* editing operations that mutate:

- the **canvas prefab document** (Phaser `MainScene` editing), and
- the **assets tree + filesystem** (Assets Panel operations),

driven by a **single global chronological history** (one timeline), via:

- **Keyboard shortcuts**
  - Undo: **Ctrl/Cmd+Z**
  - Redo: **Ctrl/Cmd+Y**
- **Commands API** so panels (Hierarchy/Inspector/Assets/etc.) can trigger undo/redo without tight coupling to Phaser internals.

Scope per requirements:

- **Canvas**: all operations listed (transform/move, align, create/duplicate/paste, delete, move-in-hierarchy, group/ungroup, component edits)
- **Assets**: create folder, create prefab file, duplicate, rename, delete (trash), and (future-proof) move assets between folders
- **Timeline**: global chronological (canvas + assets are interleaved by time)
- **Resets**:
  - Canvas history becomes invalid when opening a different prefab
  - Assets history becomes invalid when opening a different project

## Constraints & existing architecture observations

- `src/AppCommands.ts` currently defines the Phaser-facing command API; `MainScene.setupAppCommands()` wires handlers.
- Most mutations happen in `MainScene`:
  - Object lifecycle: create/duplicate/paste/delete, move in hierarchy
  - Group/ungroup
  - Align
  - Transform changes via selection drag & keyboard arrow moves (and likely TransformControls interactions, via `EditContext.onDragStart/onDragEnd`)
  - Components: add/remove/move/paste component
- Prefab content already has stable serialization primitives:
Assets operations are implemented in `src/components/assetsPanel/AssetsPanel.tsx` and currently mutate:

- the filesystem via tRPC (`createFolder`, `createTextFile`, `duplicate`, `rename`, `trash`)
- the in-memory asset tree (`state.assets.items`)

## Design choice (future-proof + scalable)
  - `EditableContainer.toJson()` and `EditableObjectsFactory.fromJson(...)`
  - Prefab persistence uses `root.toJson()` + `trpc.writeJson`

## Design choice (future-proof + scalable)

Implement a **global UndoHub** that stores a **single chronological stack of history entries**, where each entry can affect one or more “domains” (Canvas, Assets).

- **Canvas domain** records **document snapshots** (robust for any future mutation).
- **Assets domain** records **operations with inverses** (needed because filesystem changes can’t be reliably “snapshotted” from the frontend).

Why this hybrid approach:

- **Canvas snapshots**: robust, low-maintenance, handles multi-object edits naturally.
- **Assets inverse ops**: correct for filesystem effects (trash/restore, rename back, delete undo).

How it stays scalable:

- Introduce transactions and a single recording API used by all mutating entry points.
- Add later optimizations without changing call sites:
  - Canvas: store **JSON patches** (RFC6902) between checkpoints
  - Assets: batch multiple low-level FS ops into one history entry

## Public API changes

### 1) Global undo/redo commands (recommended)

Add an app-level undo API reachable from any panel. Two workable shapes:

- **Option A (preferred)**: `state.app.undo.undo()` / `state.app.undo.redo()` where `undo` is the global UndoHub.
- **Option B**: extend an existing app command emitter with `'undo'` and `'redo'`.

Either way, keyboard shortcuts should call the **global** undo/redo, not the scene directly (because the timeline is global chronological).

### 2) Phaser AppCommands (still needed)

In `src/AppCommands.ts` add (to allow UI → scene):

- `'undo': () => void`
- `'redo': () => void`

Optionally (recommended for UI state):

- `'get-history-state': () => { canUndo: boolean; canRedo: boolean; undoLabel?: string; redoLabel?: string }`

Rationale: panels can enable/disable toolbar buttons without reaching into Phaser internals.

### 3) History status in state (recommended)

Add a small “history status” so React UI can subscribe:

- `state.app.history = { canUndo, canRedo, undoLabel, redoLabel, length }`

This should be updated by UndoHub when history changes (push/undo/redo/clear).

## Data model

### Global history entry (UndoHub)

```ts
type HistoryDomain = 'canvas' | 'assets';

type HistoryEntry = {
  label: string;
  domains: HistoryDomain[];          // usually one, sometimes both
  timestamp: number;

  // Entry is considered undoable only if it’s valid for the current app context.
  // Example: a canvas entry is invalid after switching prefabs.
  isValid: () => boolean;

  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
};
```

Notes:

- **Global chronological** is achieved by always pushing into this single stack.
- Use a guard flag in UndoHub (`isApplying`) to prevent recording during undo/redo.
- When app context changes (prefab/project switch), do **not** necessarily clear undo; instead, entries become invalid via `isValid()` and are skipped.
  - Always clear **redo** on context change (standard UX, avoids cross-context redo confusion).

### Canvas snapshot format

Store enough info to restore both document and the editing “experience”:

```ts
type CanvasDocumentSnapshot = {
  // The prefab document
  rootJson: EditableContainerJson;

  // Editor context
  activeContextId: string;   // state.canvas.activeContextId equivalent
  selectionIds: string[];    // state.canvas.selection

  // Optional: restore camera if desired; can be omitted initially
  camera?: { zoom: number; scrollX: number; scrollY: number };
};
```

### Assets operations format

Assets history should be stored as an **operation** with a well-defined inverse, because it must affect disk:

```ts
type AssetsOp =
  | { kind: 'create-folder'; absPath: string }
  | { kind: 'create-file'; absPath: string; initialContent: string }
  | { kind: 'duplicate'; srcAbsPath: string; dstAbsPath: string } // inverse is trash dst
  | { kind: 'rename'; oldAbsPath: string; newAbsPath: string }
  | { kind: 'trash'; absPath: string; trashedToAbsPath?: string } // needs backend to report destination
  | { kind: 'restore-from-trash'; trashedToAbsPath: string; restoreToAbsPath: string }
  | { kind: 'move'; oldAbsPath: string; newAbsPath: string }; // same as rename, listed explicitly
```

Each assets history entry contains:

- the list of `AssetsOp` performed (forward)
- the list of inverse ops (reverse order) for undo
- plus a minimal UI snapshot if desired (e.g. selection ids), but UI-only changes are not required by scope.

Canvas history entry payload (stored inside the global entry) remains snapshot-based:

- `before: CanvasDocumentSnapshot`
- `after: CanvasDocumentSnapshot`

## UndoHub + domain adapters (new modules)

Create:

- `src/history/UndoHub.ts` (global stack + transactions)
- `src/history/domains/canvas/CanvasHistoryAdapter.ts` (captures/applies snapshots via `MainScene`)
- `src/history/domains/assets/AssetsHistoryAdapter.ts` (executes assets ops via tRPC + updates `state.assets.items`)

UndoHub responsibilities:

- Maintain stacks: `undoStack: HistoryEntry[]`, `redoStack: HistoryEntry[]`
- Provide transactional recording:
  - `begin(label: string): void`
  - `commit(): void` (pushes entry if changed)
  - `cancel(): void` (discard active transaction)
  - `transaction(label, fn): ReturnType<typeof fn>` helper
- Apply history:
  - `undo(): void`
  - `redo(): void`
- Guard against re-entrancy:
  - `isApplying` flag so applying snapshots does **not** create new history entries.
- Emit “history changed” callback so UI can sync `state.app.history`.

Canvas change detection:

- If `before.rootJson` deep-equals `after.rootJson`, do **not** push an entry.
- (Later) replace deep-equals with hash comparison or patch generation.

## Canvas: applying a snapshot (core technical work)

Add a `MainScene.applySnapshot(snapshot: CanvasDocumentSnapshot)` method used by the CanvasHistoryAdapter:

High-level algorithm:

1. **Guard clause**: if `snapshot.rootJson` is missing, return.
2. Set a flag: `this.isRestoringFromHistory = true` (or via UndoManager `isApplying`) to disable recording.
3. **Tear down current document objects** cleanly:
   - Destroy `this.root` (and thus its children).
   - Ensure `EditableObjectsFactory` removes destroyed objects from its internal map; if it currently doesn’t, add/extend cleanup so `getObjectById` doesn’t return stale entries.
4. **Rebuild document**:
   - `this.root = this.objectsFactory.fromJson(snapshot.rootJson, true) as EditableContainer`
   - `this.superRoot.add(this.root)`
5. **Reset edit contexts**:
   - Add a `this.editContexts.reset()` method (or recreate the manager) so it drops contexts/selection tied to destroyed objects.
   - Switch to the correct context:
     - Resolve `snapshot.activeContextId` to an object; if missing, fall back to `this.root`.
     - `this.editContexts.switchTo(resolvedContextContainer)`
6. **Restore selection**:
   - Filter `snapshot.selectionIds` to those that exist and are in the current context.
   - Call existing selection APIs (e.g. `selectObjects` or directly `context.setSelection(objsFromContext)`).
7. **Restore camera (optional)**:
   - If included, apply zoom/scroll and call `onResizeOrCameraChange()`.
8. Update “unsaved changes” state (see section below).
9. Unset restore flag.

Important: while restoring, suppress side effects such as `state.canvas.hasUnsavedChanges = true` triggers; afterwards, set it to the correct derived value.

## Assets: executing ops + restoring from Trash (core technical work)

### Required backend addition

To satisfy “delete undo physically restores from Trash”, add a tRPC mutation (name as you prefer):

- `restoreFromTrash({ trashedPath, restoreToPath })`

Additionally, update `trpc.trash.mutate(...)` to return the actual trash destination path:

- `trash({ path }): { trashedToPath: string }`

Rationale: the frontend must know where the OS moved the file so it can restore it.

### AssetsHistoryAdapter responsibilities

- Execute a list of `AssetsOp` (forward for redo, inverse for undo) via tRPC.
- Update `state.assets.items` consistently after each op:
  - create folder/file: insert new asset node + assign stable `id`
  - duplicate: insert duplicated node
  - rename/move: update `name` and `path` (and recursively update children paths for folders)
  - trash: remove node from tree via `removeAssetById`
  - restore: reinsert node at correct location

### Making it future-proof

Treat “move assets between folders” as `rename`/`move` at the filesystem level (path change).

## Global shortcuts & routing (because timeline is global)

Implement Ctrl/Cmd+Z and Ctrl/Cmd+Y once at the app/root level (e.g. in the Editor layout), calling UndoHub:

- UndoHub chooses the most recent **valid** entry in the global stack and undoes it.
- If the top entry is invalid (e.g. canvas entry after prefab switch), UndoHub skips it and continues scanning backward.

Avoid handling undo/redo shortcuts separately inside `MainScene` and `AssetsPanel`, otherwise you’ll get double-handling conflicts.

## Recording strategy: where to hook transactions

Recording should happen at the **entry points where mutations begin**, through a shared API:

- `undoHub.transaction(label, fn)` for discrete actions
- `undoHub.begin(label)` / `undoHub.commit()` for gesture-bounded actions (drag)

### A) Canvas mutations (via AppCommands + MainScene)

Wrap each mutating handler registered in `setupAppCommands()`:

- `addComponent`, `removeComponent`, `moveComponentUp`, `moveComponentDown`, `pasteComponent`
- `handleAssetDrop` (object creation)
- `createObject`, `duplicateObject`, `pasteObject` (if/when implemented), `cutObject`, `deleteObjects`
- `moveObjectInHierarchy`
- `savePrefab` should NOT create history; it only persists.

Implementation shape:

- Keep the existing handlers, but inside them:
  - `this.undo.transaction('Delete objects', () => this.deleteObjects(ids))`

Labels should be user-friendly and consistent for potential menu text later.

### B) Keyboard-driven canvas mutations

Wrap:

- **Align** (already command-based via `appCommands.on('align', ...)`)
- **Group / ungroup** in `processGrouping()`:
  - One transaction for the whole operation.
- **Paste/Cut/Copy**
  - Copy: no history
  - Cut: one history entry (copy + remove selection)
  - Paste: one history entry (pasting N objects)
- **Arrow-key moves**
  - One history entry per keydown is acceptable; optionally debounce repeats into a single entry later.
- **Reset selection transform**
  - One history entry.

### C) Dragging / continuous transforms (requirement: one entry per drag)

Use drag boundaries already present:

- `MainScene.startSelectionDrag(...)` ⇒ `undo.begin('Move')`
- `stopSelectionDrag(...)` ⇒ `undo.commit()`

If there are other continuous transforms (e.g. TransformControls rotate/scale), hook to the same concept:

- Add callbacks/events in `EditContext.onDragStart/onDragEnd` (or TransformControls events) to bracket `begin/commit`.

### D) “Other” mutations (future-proofing)

If a new editing feature is added later, it must:

- Use `withUndo` or the transaction API, **or**
- If it is continuous, call `begin/commit` around its gesture boundary.

## Undo/Redo command routing

### Keyboard shortcuts

Implement globally (single handler):

- `Z`: if Ctrl/Cmd pressed and **not** Shift ⇒ UndoHub.undo()
- `Y`: if Ctrl/Cmd pressed ⇒ UndoHub.redo()

Prevent default to avoid browser page-level undo/redo behaviors.

### AppCommands events (Canvas domain)

In `MainScene.setupAppCommands()` add listeners that delegate to the global hub’s canvas adapter:

- `appCommands.on('undo', ...)` and `appCommands.on('redo', ...)` should call UndoHub (not a scene-local stack),
  or can be omitted if UI calls UndoHub directly.

## History lifetime & reset

Requirements:

- Canvas entries should not be undoable after switching to a different prefab.
- Assets entries should not be undoable after switching to a different project.

Implementation in UndoHub:

- Canvas adapter includes `prefabId` in snapshot/entry metadata and sets `isValid()` to:
  - `currentPrefabId === entryPrefabId`
- Assets adapter includes `projectId` and sets `isValid()` to:
  - `currentProjectId === entryProjectId`
- On prefab/project change:
  - **clear redo stack**
  - keep undo stack but invalid entries will be skipped (optionally purge them lazily)

Where to detect:

- Prefab id is available via `MainSceneInitData.prefabAsset.id`.
- Project id should be sourced from the app/project state (whichever stable identifier exists).

## Unsaved changes behavior (“as you see fit”)

Make `state.canvas.hasUnsavedChanges` **derived** from document equality to the baseline snapshot.

Plan:

1. On scene load, store `baselineRootJson = root.toJson()` (or a stable hash of it).
2. After every committed transaction and after undo/redo apply:
   - Compute `currentRootJson = root.toJson()`
   - Set `state.canvas.hasUnsavedChanges = !deepEqual(currentRootJson, baselineRootJson)`
3. On `savePrefab()` success:
   - Update baseline to the saved state and set `hasUnsavedChanges = false`.

This removes the “sticky true” behavior and correctly supports “undo back to clean”.

## Selection + context restoration (“as you see fit”)

Restore **both**:

- `activeContextId`
- `selectionIds`

Fallback rules:

- If the saved context no longer exists, fall back to `root`.
- If some selected ids no longer exist, drop them and keep the rest.
- If selection spans multiple contexts (shouldn’t happen today), prefer objects in the active context.

## Performance & future enhancements

Phase 1 (baseline, simplest):

- Store full `EditableContainerJson` snapshots in history entries.
- Enforce caps to prevent unbounded memory growth:
  - **Assets**: cap at **50** entries
  - **Canvas**: cap at **100** entries (adjustable)

Phase 2 (optimization, no call-site changes):

- Replace `rootJson` storage with **patches**:
  - Store `before` snapshot occasionally (checkpoint every N entries) and patches in between, or
  - Store RFC6902 patches from `before → after` and inverse patches.
- Consider a stable hashing strategy for change detection (fast) vs deep-equals (slow).

## Implementation steps (recommended order)

1. **Add UndoHub**
   - Create `src/history/UndoHub.ts` with global stack, transactions, guard flags, validity skipping, caps (assets 50, canvas 100).
2. **Wire global shortcuts**
   - Add a single global keydown handler that calls UndoHub.undo/redo.
3. **Canvas adapter**
   - Implement `captureSnapshot()` + `applySnapshot()` integration with `MainScene`.
   - Record `prefabId` and invalidate on prefab switch.
4. **Canvas recording**
   - Wrap all canvas mutations with UndoHub transactions.
   - Bracket drags with begin/commit to ensure one entry per drag.
5. **Assets adapter**
   - Implement execution of assets ops + inverse ops.
   - Update `state.assets.items` consistently for each op type.
   - Record `projectId` and invalidate on project switch.
6. **Backend support for trash restore**
   - Add `trash()` return `{ trashedToPath }`
   - Add `restoreFromTrash({ trashedPath, restoreToPath })`
7. **Assets recording**
   - Wrap `AssetsPanel.tsx` operations:
     - create folder, create prefab, duplicate, rename, delete (trash)
     - (future) move between folders treated as rename/move
8. **Unsaved changes derivation**
   - Keep canvas “baseline” snapshot and set `hasUnsavedChanges` based on equality after commit/undo/redo.
9. **Expose history state for UI**
   - Update `state.app.history` from UndoHub callbacks.
10. **Manual test plan**
    - **Canvas**: drag move = 1 undo; align, group/ungroup, component changes, hierarchy moves, delete all undo/redo correctly; undo to baseline clears unsaved flag.
    - **Assets**: create folder/prefab, duplicate, rename, delete→undo restores from trash; redo re-applies; history survives prefab switches but not project switches.
    - **Global timeline**: interleave actions (e.g. rename asset, move canvas object, duplicate asset) and verify Ctrl+Z undoes them in correct chronological order, skipping invalid entries after context switches.

## Acceptance criteria

- Ctrl/Cmd+Z undoes the last edit; Ctrl/Cmd+Y redoes it.
- Global chronological timeline: canvas + assets actions are interleaved by time.
- All listed operations are undoable/redoable.
- Continuous drag produces **one** undo step per drag.
- Canvas entries are not undoable after opening a different prefab (skipped/invalidated).
- Assets entries are not undoable after opening a different project (skipped/invalidated).
- `state.canvas.hasUnsavedChanges` becomes false when undo returns document to baseline state.

