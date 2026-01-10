# Refactor Plan — Prefab Lock + Document Coherence + Caching + AssetPack

read_when: after code review feedback; before implementing prefab-instance UX/DX tweaks; before adding more prefab overrides/features.

## Goals

- UX/DX: allow instance-root ops (move/rename/delete/duplicate), lock only “inside instance”.
- Correctness: expanded/collapsed documents coherent; Control RPC returns reliable pair.
- Correctness: prefab template/document caches invalidated; no stale templates after save/asset reload.
- Runtime/editor parity: assetPack includes assets needed by overrides (esp. instance overrides).

## Non-goals

- Full schema validation (nice-to-have later).
- Perfect override semantics for every object/component type (incremental).

---

## Issue A — Lock predicate too broad

### Problem

- `isPrefabLocked(obj)` == `Boolean(obj.prefabMeta)` locks **instance root** and **children** equally.
- Current behavior blocks expected ops on placed prefab instance (delete/move/rename/duplicate).

### Desired behavior

- Instance root: allow rename/move/delete/duplicate/group/ungroup/reorder at parent level.
- Inside instance: block structural edits (add/remove/reparent/duplicate/paste into, etc.).
- Messaging: toast only when user attempts a blocked operation; no spam.

### Plan

- Add explicit “instance root vs inside” predicates (single source of truth).
    - `isInsidePrefabInstance(obj)` => obj has `prefabMeta` AND obj is not the instance root.
    - `isPrefabInstanceRoot(obj)` => obj.kind==='Container' AND obj.prefabMeta?.instanceRootRuntimeId === obj.id (or existing helper in `prefabDocumentUtils`).
    - `getPrefabInstanceRootId(obj)` => obj.prefabMeta?.instanceRootRuntimeId (for comparisons).
- Replace callers:
    - Ops that should be blocked only “inside”: use `isInsidePrefabInstance`.
    - Ops that should block moving/deleting the instance itself: none (unless product decides otherwise).
- Update selection ops + edit context duplication:
    - `MainSceneSelectionOps.canMutateHierarchy/canMutateContext`: treat instance root as allowed.
    - `EditContext` ctrl/meta duplicate check: block only when duplicating **non-root** objects inside instance, but allow duplicating the instance root container itself.
- Add a small table of allowed/blocked ops in `docs/features/prefabs.md` (keep it user-facing, not enginey).

### Verification

- Manual: place prefab instance; verify you can move/rename/delete/duplicate the instance root.
- Manual: select nested child inside instance; verify duplicate/delete/reparent/paste blocked with toast.

---

## Issue B — Prefab template/document caches never invalidated

### Problem

- `PrefabDocumentService` caches `prefabDocuments` + `resolvedTemplates` indefinitely.
- After saving a prefab (or asset reload), newly created instances and overrides can use stale template/document.

### Plan

- Add explicit invalidation API on `PrefabDocumentService`.
    - `invalidatePrefab(prefabId: string)` => delete from both maps.
    - `invalidateAll()` => clear both maps (fallback when unsure).
- Wire invalidation triggers (pick smallest set that is correct):
    - On save of current prefab asset id: invalidate that prefab id (and optionally parents?).
    - On assets refresh / project open / file watcher updates for prefabs: invalidate affected prefab ids.
    - On `openPrefab(assetId)`: invalidate just that assetId before load (avoids stale doc from earlier session).
- Add minimal logging:
    - `prefab-doc cache-hit/miss/invalidate prefabId=...`.

### Verification

- E2E-ish: open prefab B, edit/save B, then create new instance of B elsewhere; confirm new instance reflects latest B.

---

## Issue C — Asset pack generation skips prefab instances

### Problem

- AssetPack traversal bails on `PrefabInstanceJson` nodes.
- If overrides change assets (image textureKey/frameKey, fonts), parent prefab’s `assetPack` can miss required assets.

### Plan (phased; choose safest first)

- Phase 1 (safe): include assets referenced by overrides.
    - Traverse document; when encountering `PrefabInstanceJson`, scan its `overrides.objects` patches for asset-relevant fields:
        - `textureKey`, `frameKey`, `font`, `style.fontFamily`, bitmap font `font` etc.
    - Map those to assets (via existing `asset.id` in runtime JSON? if not present, decide a lookup strategy).
    - Add them to `assetPack` alongside normal traversal.
- Phase 2 (better): resolve instance to expanded template for assetPack.
    - Use `PrefabDocumentService.resolveTemplateAsync(prefabId)` and apply instance overrides to a resolved tree (without instantiating runtime objects).
    - Traverse resolved expanded JSON to collect all required assets.
    - Deterministic + complete, but needs careful caching/invalidation integration (Issue B).
- Confirm intended “ownership”:
    - Option A: parent prefab’s `assetPack` must include everything needed for its collapsed doc (incl. nested instances).
    - Option B: runtime loads nested prefab packs separately (then parent pack can skip nested). If B, codify it and ensure runtime loader actually loads nested packs.

### Verification

- Add a prefab instance override that swaps an image asset or font; save; reload; confirm render without missing asset warnings.

---

## Issue D — Expanded/collapsed document coherence (`getPrefabDocument`)

### Problem

- `expanded` comes from Valtio `state.canvas.root`.
- `collapsed` comes from app command returning `deps.rootToJson()` (PrefabDocumentService serialization).
- They can diverge (timing, normalization, localId generation, prefab markers).

### Plan

- Make `getPrefabDocument` return both from one authority.
    - Preferred: use `MainScenePrefabPersistence.getPrefabDocument()` and make it build:
        - `collapsed`: `deps.rootToJson()` (PrefabDocumentService serialization).
        - `expanded`: expand `collapsed` (or serialize runtime root consistently).
    - Alternatively: have PrefabDocumentService provide `serializeRuntimeToExpanded(root)` + `serializeRuntimeToDocument(root)` and return both from that service.
- Decide invariants and document them:
    - `collapsed` round-trips: expand(collapse(runtime)) should be equivalent for non-prefab content.
    - `expanded` includes baked children, no `PrefabInstanceJson` nodes.
    - `collapsed` contains `PrefabInstanceJson` nodes; no expanded children for instance.
- Update control-rpc contract description and handler accordingly; keep backwards compatibility if needed (or bump).

### Verification

- RPC: call `getPrefabDocument`; ensure `collapsed` contains `PrefabInstanceJson` for nested prefabs, `expanded` does not.
- Undo/redo: snapshot uses `collapsed`; restoring produces same runtime.

---

## Implementation order (low risk → higher)

1. Lock semantics: predicates + callers (Issue A).
2. `getPrefabDocument` coherence: single authority + invariants (Issue D).
3. Cache invalidation API + basic wiring (Issue B).
4. AssetPack: Phase 1 override-assets; then Phase 2 if needed (Issue C).

---

## Final checklist

- After implementation: run `npm run typecheck` and `npm run lint` (use `npm run lint:fix` when appropriate); fix any errors found.
