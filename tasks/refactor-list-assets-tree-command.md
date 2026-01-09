## Goal

- Rename the control-rpc contract command file `packages/control-rpc-contract/src/commands/listAssets.ts` to `listAssetsTree.ts`.
- Rename the command/method from **`listAssets` → `listAssetsTree`**.
- Add an optional **subtree filter**: list only a subtree by specifying a **project-relative `path`**, while keeping existing type-filtering.

---

## Current state

- **Contract**: `packages/control-rpc-contract/src/commands/listAssets.ts`
    - Defines `AssetNode`, `assetNodeSchema`, and `listAssetsCommand`.
    - Input supports `types?: AssetType[]`.
    - Output is `{ assets: AssetNode[] }` (a forest of roots).
- **API registry**: `packages/control-rpc-contract/src/ControlApi.ts`
    - Imports `listAssetsCommand` and registers it as method `listAssets`.
    - Re-exports `assetNodeSchema`, `assetTypeSchema`, `AssetNode`, `AssetType` from `./commands/listAssets.js`.
- **Renderer handler**: `src/renderer/control-rpc/service/handlers/listAssets.ts`
    - Reads `state.assets.items`, maps through `normalizeAssetPaths(...)`, optionally prunes by type via `pruneAssetByType(...)`, returns `{ assets }`.
- **Existing traversal utility**: `src/renderer/control-rpc/service/utils/assets.ts`
    - `findAssetByPath(items, projectRelativePath, projectDir)` traverses folders/spritesheets.
    - `toProjectRelativePath` is used to normalize input paths against `projectDir`.
- **Consistency note**: `getAssetInfo` throws if `path` is provided but not found; we should match that for subtree listing.

---

## Proposed design

- **New RPC method name**: `listAssetsTree`
    - Rationale: existing method already returns a tree; the rename clarifies behavior and frees `listAssets` for a future “flat list” if needed.
- **Command definition**
    - **File**: `packages/control-rpc-contract/src/commands/listAssetsTree.ts`
    - **Export**: `listAssetsTreeCommand`
    - **Input**:
        - `types?: AssetType[]` (existing behavior)
        - `path?: string` (new)
            - Semantics: project-relative path (same “path” contract used across the asset commands).
            - Normalization: accept common variants and normalize (`./`, leading slashes, OS separators) to match `toProjectRelativePath` behavior in the handler.
    - **Output**: `{ assets: AssetNode[] }` (unchanged shape)
        - If `path` is provided and found, return **exactly one root**: `assets: [subtreeRootNode]`.
        - If `path` is omitted, return the existing root forest.
        - If `path` is provided and not found, **throw** with a clear message: `asset not found for path '<path>'`.
- **Guard clauses** (return early)
    - No project open → throw (keep existing behavior).
    - `path` provided but empty after trimming → throw (Zod `.min(1)` should enforce this).
    - `path` provided but not found → throw early before applying pruning.

---

## Touch points (file-by-file)

- **Contract**
    - Rename `packages/control-rpc-contract/src/commands/listAssets.ts` → `.../listAssetsTree.ts`.
    - Update exports/ids:
        - Rename `listAssetsCommand` → `listAssetsTreeCommand`.
        - Keep `assetTypeSchema`, `assetNodeSchema`, `AssetNode`, `AssetType` in the new file so imports remain coherent.
    - Update `packages/control-rpc-contract/src/ControlApi.ts`:
        - Import `listAssetsTreeCommand` from `./commands/listAssetsTree.js`.
        - Register it under key `listAssetsTree`.
        - Update re-exports to come from `./commands/listAssetsTree.js` (asset schemas/types are still defined there).
    - Update any barrel exports / package entrypoints if needed (search for `commands/listAssets` imports).
- **Renderer**
    - Rename handler file `src/renderer/control-rpc/service/handlers/listAssets.ts` → `.../listAssetsTree.ts`.
    - Update handler implementation:
        - If `params.path`:
            - Resolve subtree root by path:
                - Prefer `findAssetByPath(state.assets.items, params.path, state.projectDir)` (it already normalizes).
            - If not found → throw.
            - Normalize only that node via `normalizeAssetPaths`.
            - Apply type pruning to the subtree root (same semantics as before: keep matching descendants even if the root type isn’t selected).
            - Return `{ assets: [rootAfterOptionalPrune].filter(Boolean) }`.
        - Else (no path): keep existing behavior over all roots.
    - Update handler registration wiring (wherever command handlers are mapped by method name) from `listAssets` → `listAssetsTree`.
    - Update any renderer callsites that invoked `listAssets`.
- **Editorctl / client**
    - Update any typed method references to the new method name `listAssetsTree`.
    - Update docs/examples if `listAssets` is referenced in READMEs or verification scripts.

---

## Rollout order (safe sequencing)

- Update contract file + exports first (`control-rpc-contract`), so types are available.
- Update renderer handler implementation and handler registration to support `listAssetsTree`.
- Update editorctl client usage and any tests/scripts.
- (Optional) If you want compatibility: add a temporary alias method `listAssets` in `ControlApi.ts` that points to the same command/handler, then remove in a follow-up. (Not requested, so default plan is a hard rename.)

---

## Risks / edge cases

- **Path normalization ambiguities**: ensure both `path` input and stored `asset.path` comparisons go through `toProjectRelativePath(...)` to avoid mismatches across OS separators.
- **Type pruning interaction with subtree**: pruning a single root must preserve descendants (existing `pruneAssetByType` behavior does this for folders/spritesheets).
- **Spritesheet virtual nodes**: `findAssetByPath` traverses spritesheet frames/folders; confirm that `path` for virtual nodes is stable and matches the normalized `AssetNode.path` values returned to clients.

---

## Testing notes

- **Unit-ish sanity via editorctl** (when an editor is running):
    - `npm run editorctl -- ls` to get the target port.
    - `npm run editorctl -- --port <wsPort> methods` to confirm `listAssetsTree` exists.
    - `npm run editorctl -- --port <wsPort> call listAssetsTree '{}'` should return the full roots.
    - `npm run editorctl -- --port <wsPort> call listAssetsTree '{"path":"assets"}'` (replace with a real folder path) should return `assets.length === 1`.
    - `npm run editorctl -- --port <wsPort> call listAssetsTree '{"path":"does/not/exist"}'` should error with `asset not found for path`.
- Add/update any e2e coverage only if there is already a control-rpc test harness for asset listing; otherwise keep this as a refactor + API change verified via `editorctl`.

---

## Final checklist

Run `npm run typecheck` and `npm run lint` (use `npm run lint:fix` if appropriate), and fix any errors found.
