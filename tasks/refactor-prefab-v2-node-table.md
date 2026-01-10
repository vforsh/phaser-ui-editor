## Goal

Move prefab persistence to a **diff/merge-friendly, canonical JSON format** while keeping `.prefab` as the file extension:

- **On-disk format**: JSON (tabs), **node table** (`rootId` + `nodes` map), include **defaults** (no omit-defaults), round floats to **4 decimals**.
- **No backward compatibility**: the editor will only read **V2**.
- **Asset refs**: use **7a** — store **`assetId` only** in nodes (avoid `{id,name,type}` churn).
- Add a **conversion script** to migrate existing `.prefab` files in-place.

---

## Current state

- **Prefab file type**: `src/renderer/types/prefabs/PrefabFile.ts` defines:
    - `content: EditableContainerJson | null`
    - `assetPack: Phaser pack sections`
- **Save path**: `MainScenePrefabPersistence.savePrefab()` serializes `root.toJson()` and writes via `mainApi.writeJson({ spaces: '\t' })`.
    - `root.toJson()` for each object currently spreads `...this.toJSON()` (Phaser serialization), which introduces:
        - redundant/derived fields (`origin` + `originX/Y`, `rotation` + `angle`, etc.)
        - large nested blobs (`data`), high precision floats
        - unstable diffs for small edits
- **Load path**: `MainScenePrefabPersistence.initRoot()` loads prefab assets from `prefabFile.content` and rehydrates via `EditableObjectsFactory.fromJson(...)`.
- **Important diff footgun**: `EditableObjectsFactory.fromJson()` generates **new ids** when rehydrating (`getObjectId()`), ignoring `json.id`.
    - This makes “open → edit → save” prone to huge diffs (ids churn).

Key files:

- `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainScenePrefabPersistence.ts`
- `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneAssetLoader.ts`
- `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObjectsFactory.ts`
- `src/renderer/types/prefabs/PrefabFile.ts`
- `src/renderer/types/exports/exports.ts`

---

## Proposed design

### New on-disk schema: `PrefabFileV2`

Keep `.prefab` files as JSON, but switch the payload to:

- `version: 2`
- `rootId: string`
- `nodes: Record<string, PrefabNodeV2>` (insertion-ordered by **sorted id** when writing)
- `assetPack: PrefabFile['assetPack']` (keep as-is; already deterministically sorted)

`PrefabNodeV2` (conceptual):

- **Identity & hierarchy**
    - `id: string` (redundant with map key but useful for validation)
    - `type: EditableObjectJson['type']`
    - `name: string`
    - `parentId: string | null`
    - `children: string[]` (order-preserving)
- **Common render/visibility fields** (include defaults, per requirement)
    - `x`, `y`, `angle`
    - `scale: { x, y }`
    - `alpha`, `visible`
    - `depth`, `blendMode`
    - `originX`, `originY` (for types that support it; still present but may be ignored for Container/NineSlice)
    - `locked`
- **Type-specific**
    - Image/NineSlice: `textureKey`, `frameKey`, and **`assetId`** (7a)
    - Text: `text`, `style` (authoring subset), spacing/padding/wrap fields
    - BitmapText: `font`, `text`, `fontSize`, `align`, `maxWidth`, spacing fields
    - Container: `width`, `height`, `prefab` ref (if needed), etc.
    - Graphics: shape/fill/stroke
- `components: EditableComponentJson[]` (existing JSON, but later we can canonicalize component fields too)

### Canonicalization (diff-minimizing rules)

Implement a deterministic serializer for V2 that:

- **Rounds floats** to 4 decimals on write for known float fields (x/y/scale/origin/alpha/angle/width/height/etc.).
    - Guard: if value is not finite (`NaN`, `Infinity`), throw with a clear error (don’t write corrupt prefabs).
- **Stable key order** by constructing objects in a fixed field sequence.
- **Stable node order** by inserting `nodes` entries sorted by id.
- **No Phaser `toJSON()`**: do not persist `data`, `origin: {x,y}`, `rotation`, etc.

### Runtime boundary: keep editor internals mostly unchanged

To keep scope tight:

- Keep in-memory editing model as-is (Phaser objects + `stateObj` proxies).
- Add “deflate/inflate” helpers at the prefab boundary:
    - **Deflate** runtime root (`EditableContainer`) → `PrefabFileV2`
    - **Inflate** `PrefabFileV2` → a nested `EditableContainerJson` (or directly instantiate objects)

### ID behavior (critical for small diffs)

Even though preserving ids isn’t required, **stable ids are the biggest single reducer of diff/merge conflicts**.

Change `EditableObjectsFactory.fromJson(...)` to support:

- `fromJson(json, { preserveIds: true })` for prefab loading
- default `preserveIds: false` for clone/clipboard/paste

Implementation sketch:

- Add optional `desiredId?: string` to internal create methods, or add new “createFromJsonPreserveId” helpers.
- In preserve mode, register the object using the json’s id, with guards:
    - If id already exists in the current factory map, generate a new id and log a warning (deterministic fallback isn’t required, but avoid crashing).

---

## Asset references (decision)

Use **`assetId` only** in V2 nodes (7a). This avoids prefab churn on asset renames and keeps diffs/merges small.

---

## Touch points (file-by-file)

- **Types**
    - `src/renderer/types/prefabs/PrefabFile.ts`
        - Replace current `PrefabFile` with `PrefabFileV2` (no backward compat), or introduce `PrefabFileV2` and switch all callsites.
    - `src/renderer/types/exports/exports.ts`
        - Export the new prefab types (and update `exports.d.ts` via `npm run build-types` later).

- **Prefab IO boundary**
    - `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainScenePrefabPersistence.ts`
        - `savePrefab`: `rootToJson()` → **deflate** root → `PrefabFileV2` → `mainApi.writeJson`
        - `initRoot`: detect/validate `version: 2` and **inflate** → load assets → rehydrate

- **Inflate/deflate helpers** (new, keep files small)
    - Add a focused module (e.g. `src/renderer/types/prefabs/prefabV2Serde.ts`) containing:
        - `deflateEditableRootToPrefabV2(root: EditableContainer, opts)`
        - `inflatePrefabV2ToEditableContainerJson(prefab: PrefabFileV2)`
        - `canonicalizePrefabV2ForWrite(prefab: PrefabFileV2)` (rounding + key order + node ordering)
        - Guard-heavy validation helpers (`assertValidPrefabV2(...)`)

- **Rehydration id preservation**
    - `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObjectsFactory.ts`
        - Add `preserveIds` option and ensure prefab load uses it.

- **Asset loading**
    - `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneAssetLoader.ts`
        - If we choose `assetId` only, update `calculatePrefabAssets(...)` traversal to read asset ids from the inflated JSON (or directly from V2 nodes).

- **Docs**
    - `docs/features/canvas/objects.md`
        - Update serialization section to mention V2 node-table and canonicalization rules.

- **Conversion script**
    - Add a Node script under `scripts/` (e.g. `scripts/convert-prefabs-to-v2.ts`)
        - CLI: `--root <dir>` (required) + optional `--glob` (default `**/*.prefab`)
        - Recursively find prefabs, parse V1, convert to V2, overwrite in-place.
        - Print summary: files converted, failures.
    - Add an npm script in `package.json` (e.g. `prefabs:convert-v2`) that runs the node script.

---

## Rollout order (safe sequencing)

1. **Introduce V2 types + serde helpers** (deflate/inflate + canonicalization + validation).
2. **Update runtime to load V2** (fail fast if version is missing/incorrect).
3. **Update save path to write V2**.
4. **Fix id preservation in `EditableObjectsFactory` for prefab load** (prevents id churn diffs).
5. **Add conversion script** and run it on the repo’s prefabs (e.g. `/Users/vlad/dev/papa-cherry-2/dev/assets/prefabs`).
6. **Update docs**.

---

## Risks / edge cases

- **Duplicate ids** in a prefab: preserve-ids mode must guard and resolve safely (warn + regenerate conflicting ids).
- **Missing nodes/parent pointers**: inflate should validate graph integrity (all referenced children exist, root exists, no cycles).
- **Type-specific required fields**: validate per-node requirements before trying to instantiate objects (early returns + descriptive errors).
- **Asset id resolution failures**: if using `assetId` only, loader must warn clearly when an id is missing from the asset index.

---

## Testing notes

- **Golden diff test** (manual but high-signal):
    - Convert a prefab, open it, nudge one object position slightly, save.
    - Verify git diff touches only that node’s fields (plus `assetPack` only if assets changed).
- **Round-trip sanity**:
    - Convert V1 → V2, open in editor, save immediately without changes, ensure no rewrite occurs (or only stable formatting).
- **Script dry run**:
    - Run conversion against `/Users/vlad/dev/papa-cherry-2/dev/assets/prefabs` and ensure all files parse/convert.

---

## Final checklist

After implementation, run `npm run typecheck` and `npm run lint` (fix any errors; use `npm run lint:fix` when appropriate).
