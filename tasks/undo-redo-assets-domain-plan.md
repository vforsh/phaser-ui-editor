# Assets domain Undo/Redo implementation plan

This document describes what’s left to implement for **Assets Panel filesystem + tree mutations** to fully participate in the existing **global UndoHub timeline**.

It assumes the UndoHub + global shortcuts + Canvas snapshot-based history are already in place.

## Scope (Assets domain)

Undo/Redo must cover Assets operations that mutate:

- the **filesystem** (via tRPC),
- and the **assets tree UI** (`state.assets.items` + selection),

and they must be recorded into the **single global timeline** (interleaving with Canvas actions).

### Required asset operations

- **Create folder**
- **Create prefab file** (or other create-file actions as they’re added)
- **Duplicate** (file/folder)
- **Rename** (file/folder)
- **Delete** (trash)
- (Future-proof) **Move** between folders (same as rename at FS level)

### Validity / reset rules

- **Assets history becomes invalid when opening a different project**.
  - Easiest implementation: `undoHub.clear()` when a new project is opened.
  - Alternative: keep undo stack but mark entries invalid via `isValid()`.
    - Still clear **redo** on project switch (recommended UX).

## Current architecture (relevant facts)

### Backend tRPC API (current)

File: `scripts/vite-plugins/api-server/vite-api-server.ts`

- Has: `createFolder`, `createTextFile`, `duplicate`, `rename`, `trash`, `remove`, `globby`, `stat`, etc.
- **Missing** for robust history:
  - `trash()` currently returns only `{ success: true }` and does not report where the item was moved.
  - No `restoreFromTrash(...)`.

### Assets tree identity model (important)

Asset nodes get ids by `md5(asset.path + '__' + asset.name + '__' + asset.type)` in `src/components/assetsPanel/build-asset-tree.ts`.

Implications:

- Rename/move will change `id`.
- Local incremental tree updates are error-prone (you’d need to update ids recursively and fix selection).
- **Recommended v1 approach**: after each FS op (and on undo/redo), **refresh the entire tree from disk** and replace `state.assets.items`.

This also naturally re-computes spritesheet frames / folders / derived assets.

## Design: Assets history entries as filesystem ops with inverses

We cannot snapshot the filesystem from the frontend the way we snapshot canvas JSON, so we represent Assets history as **operations with an inverse**.

### Data model

Create new module, e.g. `src/history/domains/assets/AssetsHistoryAdapter.ts`:

```ts
export type AssetsOp =
  | { kind: 'create-folder'; absPath: string }
  | { kind: 'create-file'; absPath: string; initialContent: string }
  | { kind: 'rename'; oldAbsPath: string; newAbsPath: string }
  | { kind: 'trash'; absPath: string; trashedToAbsPath?: string }
  | { kind: 'restore-from-trash'; trashedToAbsPath: string; restoreToAbsPath: string }
  | { kind: 'duplicate'; srcAbsPath: string; dstAbsPath: string; trashedToAbsPath?: string }
  | { kind: 'move'; oldAbsPath: string; newAbsPath: string }
```

Notes:

- `move` is semantically the same as `rename`; keep it to make intent explicit.
- `trash` includes `trashedToAbsPath` so undo can restore.
- `duplicate` should stabilize redo/undo: see “redo stability” below.

### Redo stability requirement (critical)

If redo uses filesystem ops that produce different outputs each time (e.g. OS trash destination may vary), then “undo after redo” can break unless the entry tracks the updated destination.

Recommended approach:

- For history entries that call `trash`, store `trashedToAbsPath` **in a closure variable** and update it on each redo:
  - `redo(): trashedToAbsPath = (await trpc.trash.mutate(...)).trashedToAbsPath`
  - `undo(): await trpc.restoreFromTrash({ trashedToAbsPath, restoreToAbsPath })`

This keeps the HistoryEntry object immutable “enough” while still allowing correct replay.

## Backend changes (tRPC)

File: `scripts/vite-plugins/api-server/vite-api-server.ts`

### 1) Make `trash` return the trash destination path

Current:

- `trash({ path }): { success: true }`

Change to:

- `trash({ path }): { trashedToAbsPath: string }`

Implementation detail:

- The `trash` npm package typically resolves to an array of moved paths. Verify by type or runtime, then return the first entry.
- Guard: if the returned array is empty, throw.

### 2) Add `restoreFromTrash`

Add a new mutation:

- `restoreFromTrash({ trashedToAbsPath, restoreToAbsPath }): { success: true }`

Implementation:

- Validate absolute paths with `absPathSchema`
- Use `fs-extra`:
  - `await fse.move(trashedToAbsPath, restoreToAbsPath, { overwrite: false })`
- Ensure the restore destination parent directory exists:
  - `await fse.ensureDir(path.dirname(restoreToAbsPath))`

### 3) (Optional but recommended) Add `copy` and `move` helpers

Not required if you use existing `duplicate` and `rename`, but useful later:

- `copy({ srcAbsPath, dstAbsPath })`
- `move({ oldAbsPath, newAbsPath })` (alias of rename)

## Frontend: refresh tree helper (v1)

Add a small helper used by Assets adapter + UI after ops:

Suggested file: `src/components/assetsPanel/refresh-assets-tree.ts` (or `src/history/domains/assets/refreshAssetsTree.ts`).

Algorithm (mirrors `EditorLayout.openProject`):

1. Guard: if `state.projectDir` or `state.project` missing → return.
2. Compute assets glob: `path.join(openedProject.assetsDir, '**/*')`
3. Compute ignore globs from `state.project.assetsIgnore` (same as `EditorLayout`).
4. `const paths = await trpc.globby.query(...)`
5. `const tree = await buildAssetTree(paths, openedProject.assetsDir)`
6. `state.assets.items = stateSchema.shape.assets.shape.items.parse(tree)`

Important:

- Ensure the same “absolute vs relative” convention is used everywhere.
- Today assets are built from absolute filepaths; keep it consistent.

## Frontend: AssetsHistoryAdapter

Create `src/history/domains/assets/AssetsHistoryAdapter.ts`.

### Responsibilities

- Execute forward/inverse ops via tRPC.
- Refresh the in-memory tree after each executed op (v1 simplicity).
- Optionally restore selection (nice-to-have; not strictly required by current acceptance criteria).

### API proposal

```ts
export class AssetsHistoryAdapter {
  constructor(private readonly undoHub: UndoHub) {}

  get projectId(): string | null {
    return state.projectDir ?? null
  }

  async applyOps(ops: AssetsOp[]): Promise<void> {
    for (const op of ops) await this.applyOp(op)
    await refreshAssetsTree()
  }

  private async applyOp(op: AssetsOp): Promise<void> { ... }

  pushEntry(args: {
    label: string
    projectId: string
    undo: () => Promise<void>
    redo: () => Promise<void>
  }): void { ... }
}
```

### Operation mapping (applyOp)

- `create-folder`: `await trpc.createFolder.mutate({ path: absPath })`
- `create-file`: `await trpc.createTextFile.mutate({ path: absPath, content: initialContent })`
- `rename/move`: `await trpc.rename.mutate({ oldPath, newPath })`
- `trash`:
  - `const { trashedToAbsPath } = await trpc.trash.mutate({ path: absPath })`
  - store `op.trashedToAbsPath = trashedToAbsPath` if you’re mutating ops
  - or return it to caller via a closure variable (preferred; see below)
- `restore-from-trash`: `await trpc.restoreFromTrash.mutate({ trashedToAbsPath, restoreToAbsPath })`
- `duplicate`:
  - Prefer stable redo:
    - **Forward**: call `trpc.duplicate({ path: srcAbsPath })` but it picks a “-copy” name. Record returned `dstAbsPath`.
    - **Undo**: trash that exact `dstAbsPath` and capture `trashedToAbsPath`.
    - **Redo**: restore from trash back to `dstAbsPath` (stable).
  - This requires storing `trashedToAbsPath` across undo/redo; easiest via closure variable.

## Frontend: recording assets operations in `AssetsPanel.tsx`

File: `src/components/assetsPanel/AssetsPanel.tsx`

Add:

- `const undoHub = useUndoHub()`
- (Optional) `const projectId = state.projectDir` guard.

### Wrap each mutating action with an UndoHub entry

The pattern:

1. Perform the action (filesystem + state update), but **prefer** not to manually update state tree; instead call `refreshAssetsTree()` after FS completes.
2. Push a `HistoryEntry` into UndoHub that:
   - `isValid`: `state.projectDir === projectIdAtRecordTime`
   - `undo`: runs the inverse ops and refreshes
   - `redo`: re-runs forward ops and refreshes

#### Create folder

- Forward: `createFolder(absPath)`
- Inverse: either `remove(absPath)` or `trash(absPath)`
  - Prefer `remove` to avoid polluting OS trash.
  - If you want redo stability without re-creating (not required), use trash/restore model instead.

#### Create prefab file

- Forward: `createTextFile(absPath, initialContent)`
- Inverse: `remove(absPath)` (or `trash`)

#### Rename

- Forward: `rename(oldAbsPath, newAbsPath)`
- Inverse: `rename(newAbsPath, oldAbsPath)`

#### Duplicate

- Forward: `duplicate(srcAbsPath) -> dstAbsPath`
- Undo: `trash(dstAbsPath) -> trashedToAbsPath`
- Redo: `restoreFromTrash(trashedToAbsPath, dstAbsPath)`

#### Delete (Trash)

- Forward: `trash(absPath) -> trashedToAbsPath`
- Undo: `restoreFromTrash(trashedToAbsPath, absPath)`
- Redo:
  - call `trash(absPath)` again and update stored `trashedToAbsPath` used by undo

### Path correctness audit (must-do before shipping)

Today `AssetsPanel` sometimes treats `asset.path` as relative and joins `state.projectDir`, but the assets tree is constructed from **absolute** paths.

Before implementing history, standardize:

- Decide and enforce: `AssetTreeItemData.path` is **absolute**.
- Then remove any `path.join(state.projectDir!, asset.path)` patterns.
- Add a small helper:
  - `getAssetAbsPath(asset) => asset.path`

This will prevent corrupt paths and is required for reliable undo/redo.

## Project switching behavior

File: `src/components/EditorLayout.tsx` (openProject flow)

When a new project is opened (successfully), do one of:

### Option A (simple, recommended v1)

- `undoHub.clear()` (clears global history)

Rationale:

- Canvas history cannot survive project switch anyway (prefabs likely different, assets changed).
- Avoids complex invalidation logic.

### Option B (keep history but invalidate)

- Assets entries: `isValid: () => state.projectDir === projectIdAtRecordTime`
- Also clear redo on project switch:
  - add `undoHub.clearRedo()` method

## UI: optional history buttons / status

Already available via `state.app.history`:

- `canUndo/canRedo`
- labels

Future:

- Add toolbar buttons for Undo/Redo (optional).
- Show “Undo <label>” / “Redo <label>” in menus.

## Manual test plan (assets)

### Setup

- Open a project with at least one prefab + some folders.
- Ensure Assets tree is visible.

### Create folder

1. Create folder.
2. Undo → folder removed.
3. Redo → folder returns.

### Create prefab file

1. Create prefab file.
2. Undo → file removed.
3. Redo → file returns.

### Rename

1. Rename a file.
2. Undo → name/path restored.
3. Redo → rename applied again.

### Duplicate

1. Duplicate a file.
2. Undo → duplicated file disappears.
3. Redo → duplicated file returns with the same path/name as first duplication (stable redo).

### Delete (Trash) + restore

1. Delete an asset (trash).
2. Undo → asset restored to original folder.
3. Redo → asset deleted again.
4. Undo again → asset restored again (requires correct `trashedToAbsPath` tracking across redo).

### Global timeline interleaving

1. Rename an asset.
2. Move an object on canvas.
3. Duplicate an asset.
4. Press Ctrl/Cmd+Z repeatedly and verify it undoes in exact reverse chronological order across domains.

### Project switch invalidation

1. Perform assets ops.
2. Open another project.
3. Ensure undo/redo does not apply old assets entries:
   - If using `undoHub.clear()`: stacks empty.
   - If using invalidation: old entries skipped, redo cleared.

## Suggested implementation order

1. **Backend**: implement `trash -> { trashedToAbsPath }` and `restoreFromTrash`.
2. **Frontend helper**: implement `refreshAssetsTree()` (single source of truth).
3. **AssetsHistoryAdapter**: implement op execution + refresh.
4. **AssetsPanel**: wrap create/rename/duplicate/delete with UndoHub entries.
5. **Project switch reset**: clear history on project open (v1) or implement invalidation + clearRedo.
6. Manual test + refine path normalization.


