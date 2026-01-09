# Assets Search Panel (Spotlight)

## Goal

Add a **global “Assets Search Panel”** (command palette) that:

- Opens from anywhere with **Ctrl + Shift + A**
- Uses **fuzzy search**
- On activation (**Enter** or click): **selects the asset in the Assets panel** and **closes**
- On **Ctrl + Enter** (only when the active result is a prefab): **opens the prefab**
- Shows only **openable assets** by default (exclude containers)

Uses Mantine Spotlight as the UI surface: [Mantine Spotlight docs](https://mantine.dev/x/spotlight/).

## Current state

- **Assets selection state** lives in `state.assets.selection` and `state.assets.selectionChangedAt` (`src/renderer/state/State.ts`).
- **Assets panel** (`src/renderer/components/assetsPanel/AssetsPanel.tsx`):
    - Has an inline fuzzy search (`AssetsSearch.tsx`) powered by `fzf` (already in deps).
    - Exposes `state.assets.locateAsset(assetId)` to expand parents + scroll asset into view.
    - Exposes `state.assets.focusPanel()` to focus the panel.
    - Opens prefabs via `appCommands.emit('open-prefab', prefabAssetId)`.
- There is currently **no Spotlight / command palette** infra in `src/renderer/` and no `@mantine/spotlight` dependency.

## Proposed design

### UX rules (as specified)

- **Open**: `Ctrl + Shift + A` from anywhere.
- **Results**:
    - Fuzzy search by **`asset.name` only**.
    - Default dataset: **openable assets only** (exclude containers such as `folder` and `spritesheet-folder`; also exclude other “virtual path only” items as needed).
- **Activation**:
    - **Enter / click**: select the active asset and close.
    - **Ctrl + Enter**: if active result is `prefab`, open it (and still select + close).
    - No “live select while moving highlight” (selection changes only on activation).

### Spotlight wiring

- Add `@mantine/spotlight` dependency.
- Import spotlight styles at app root after Mantine core styles, per docs:
    - `import '@mantine/spotlight/styles.css';` (see [Mantine Spotlight docs](https://mantine.dev/x/spotlight/)).
- Implement as a renderer component mounted once (near `App.tsx` root so it’s always available).

### Keyboard handling (guard-clause style)

Because we need **Ctrl+Shift+A** (not `mod + …`) and **Ctrl+Enter** behavior, prefer explicit key handling:

- Global listener (installed once):
    - `keydown` → if not `ctrlKey` or not `shiftKey` or key !== `a`, **return early**
    - `preventDefault()` + open spotlight
- While Spotlight is open:
    - Intercept `Enter`:
        - if no active result, **return**
        - if `ctrlKey` and active is `prefab`, open prefab
        - else, select only

Implementation detail: use Spotlight “compound components” mode so we can control the active index and activation behavior (rather than relying on Spotlight’s internal selection logic).

### Asset selection behavior

On activation (Enter/click/Ctrl+Enter):

- Update selection:
    - `state.assets.selection = [asset.id]`
    - `state.assets.selectionChangedAt = Date.now()`
- Try to reveal it in the Assets panel (guarded):
    - If `state.assets.locateAsset` is defined, call it
    - Else if `state.assets.focusPanel` is defined, call it (optional; safe)
- Close spotlight

For Ctrl+Enter on prefabs:

- After selection + close, call `appCommands.emit('open-prefab', asset.id)`

### Data + fuzzy search

- Reuse the existing `fzf` dependency for fuzzy matching over `asset.name`.
- Build a candidate list:
    - Start from `state.assets.items`
    - Flatten recursively (the helper exists today in `AssetsPanel.tsx`; extract for reuse)
    - Filter to “openable”:
        - Exclude: `folder`, `spritesheet-folder`
        - Exclude: `spritesheet-frame` (virtual path; not a real file) unless we decide it should be searchable
        - Keep: `prefab`, `image`, `json`, `xml`, `file`, `spritesheet`, `web-font`, `bitmap-font` (confirm via types in `src/renderer/types/assets.ts`)
- Limit results to ~7 for performance and to keep Spotlight body compact (Spotlight docs recommend 5–7).

### Stable test IDs

Add durable `data-testid` to the modal root and list, e.g.:

- `data-testid="assets-search-panel"`
- `data-testid="assets-search-panel-input"`
- `data-testid="assets-search-panel-results"`

## Touch points (file-by-file)

- `package.json`
    - Add `@mantine/spotlight` dependency.
- `src/renderer/App.tsx`
    - Import spotlight styles after Mantine core styles.
    - Mount `<AssetsSearchPanel />` once inside the existing providers (`MantineProvider`, `DiProvider`).
- `src/renderer/components/assetsPanel/AssetsSearchPanel.tsx` (new)
    - Implements Spotlight UI + fuzzy search via `fzf`.
    - Manages `query`, `activeIndex`, open/close, and activation behavior.
    - Uses `useAppCommands()` to emit `'open-prefab'`.
    - Uses guard clauses for all keyboard handling.
- `src/renderer/components/assetsPanel/assetTreeUtils.ts` (new, or reuse an existing utils location)
    - Extract `flattenAssets` from `AssetsPanel.tsx` so both panel + spotlight share it.
    - Add `isOpenableAssetForSearch(asset)` helper.
- `src/renderer/components/assetsPanel/AssetsPanel.tsx`
    - Replace local `flattenAssets` with imported helper to avoid duplication.

## Rollout order

1. Add `@mantine/spotlight` dependency + root CSS import.
2. Add `assetTreeUtils` helper(s) and migrate `AssetsPanel` to use them.
3. Implement `AssetsSearchPanel` with:
    - global open hotkey
    - fuzzy search results
    - activation behaviors (Enter / Ctrl+Enter)
4. Wire into `App.tsx`.

## Risks / edge cases

- **Hidden Assets panel**: `locateAsset` is only defined when `AssetsPanel` is mounted. Guard and fall back to just updating selection (and optionally calling `focusPanel` when available).
- **Key handling conflicts**: `Ctrl+Shift+A` should be safe, but still ensure we only act on exact chord and ignore repeats.
- **Virtual-path assets**: `spritesheet-frame` and `spritesheet-folder` have virtual paths; default behavior excludes them to match “openable only”.
- **Performance**: rebuild `Fzf` index only when candidate assets change; limit results to ~7.

## Testing notes

- Manual:
    - Open palette with `Ctrl+Shift+A` from canvas + from inputs.
    - Search by name; hit Enter → Assets panel selects and scrolls to asset; palette closes.
    - Search prefab; hit Ctrl+Enter → prefab opens; palette closes; selection updates.
    - Ensure non-prefab Ctrl+Enter behaves like Enter (select+close).
- (Optional later) Playwright e2e:
    - Drive hotkey, type query, assert selection + prefab open (if there is existing harness for prefab open).

## Final checklist

Run `npm run typecheck` and `npm run lint` and fix any errors found (use `npm run lint:fix` when appropriate).
