# Implementation plan: Web Font inspector section (`WebFontSection.tsx`)

## Goal

When a `web-font` asset is selected in the Assets panel, the Inspector should show a dedicated **Web Font** section that:

- Displays **useful font metadata** (format, names, metrics, coverage).
- Provides a **preview** so users can visually confirm the font.
- Helps debugging (e.g. “is it loaded?”, “does it contain glyph X?”).

This should follow the same patterns as existing asset inspector sections (e.g. `BitmapFontSection.tsx`, `GraphicAssetPreviewSection.tsx`): small React section component, async reads via `backend.*`, `AbortController`, and `until()`, and Mantine “dense” controls (`size="xs"`).

## Non-goals (v1)

- Editing the font file, subsetting, or generating variants.
- Exposing per-glyph rendering/atlas (that’s bitmap-font territory).
- Implementing full OpenType feature toggles (we’ll show them read-only first).

## Existing architecture we should reuse

- **Asset type**: `web-font` exists in `src/types/assets.ts` as `AssetTreeWebFontData` with `{ fontFamily, name, path, id }`.
- **Font parsing**: backend method `backend.parseWebFont({ path })` returns a rich `WebFontParsed` payload defined by `webFontParsedSchema` in `src/backend-contract/contract.ts`.
- **Load behavior**: `MainScene.loadWebFont()` injects an `@font-face` style using a data URL and uses `webfontloader` to wait for “active/inactive”.
- **Inspector patterns**:
  - Async data load + abort: `BitmapFontSection.tsx`
  - File stats / pretty bytes / “metadata rows”: `GraphicAssetPreviewSection.tsx`
  - Readonly copyable rows: `ReadonlyPropertyRow` in `src/components/inspector/sections/PropertyRow.tsx`

## UX / behavior (Inspector)

When inspecting a web font asset:

- Show **Basic Information** (already done by `AssetSection`).
- Add new **Web Font** section:
  - **Preview**: a sample string rendered with the font.
  - **Names**: family / full name / subfamily / PostScript name / version.
  - **Format + file**: type (TTF/WOFF/WOFF2) + file size.
  - **Coverage**: glyph count, character set count, “common ranges” badges, sample supported characters.
  - **Metrics**: unitsPerEm, ascent/descent/lineGap, optional capHeight/xHeight, italicAngle, underline metrics.
  - **OpenType features**: list available feature tags (read-only).
  - **Loaded status**: “Loaded / Not loaded” in the renderer (best-effort).

## Data flow

### Inputs

- `AssetTreeWebFontData` from selection (Inspector asset sections).
- For rich metadata: `backend.parseWebFont({ path: asset.path })` -> `WebFontParsed`.
- For file size: `backend.stat({ path: asset.path })`.
- For “loaded?” check (best-effort):
  - `document.fonts.check('16px "<familyName>"')` (guard for `document.fonts` existence).

### Outputs

- Read-only UI fields in `WebFontSection`.
- Optional warnings (e.g. if the parsed `familyName` differs from `asset.fontFamily`).

## Proposed file/module layout

- `src/components/inspector/sections/assets/WebFontSection.tsx`
  - React section rendering, async loading, and derived display values.
- (Optional) `src/components/inspector/sections/assets/webFontUtils.ts`
  - Pure helpers for:
    - deriving “coverage badges” from `characterSet`
    - formatting character samples
    - computing suggested line-height multiplier

## Step-by-step implementation plan

### 1) Add the section component scaffold

- Create `WebFontSection.tsx` under `src/components/inspector/sections/assets/`.
- Props: `BaseSectionProps<Readonly<AssetTreeWebFontData>>` (match `BitmapFontSection` style).
- State:
  - `webFontParsed: WebFontParsed | null`
  - `fileSize: number | null`
  - `loadStatus: 'unknown' | 'loaded' | 'not-loaded'` (optional)
  - `previewText: string` (local state, default sample)
  - `previewSize: number` (local state, default 32)
- Async effects (abortable):
  - `backend.parseWebFont({ path: asset.path })`
  - `backend.stat({ path: asset.path })`

Notes:

- Use `until(() => ...)` and guard “aborted” errors like other sections.
- Return early while loading (`if (!webFontParsed) return null`), unless we want skeletons.

### 2) Render “Preview” block

- Use a `Box` with a dark background similar to `GraphicAssetPreviewSection`.
- Render a `Text` (or `Box` with `style`) using `fontFamily: webFontParsed.familyName`.
- Add:
  - `TextInput`/`Textarea` for preview string (optional, `size="xs"`).
  - `NumberInput` for size.

Important nuance:

- The font might not be registered in the renderer’s CSS yet, even though we can parse it.
- v1 options:
  - **A)** Best-effort: rely on the Scene load path already injecting the font at runtime (may be true if fonts are loaded during project load).
  - **B)** Robust: inject a `@font-face` in this section too (similar to `MainScene.createWebFontCss()`), using `webFontParsed.base64`.
    - This yields the best preview reliability and makes `document.fonts.check()` meaningful.
    - Keep it scoped: create a `<style>` element, append on load, remove on cleanup.

Plan decision:

- Implement **B** (robust preview) in the inspector section, because it is self-contained and avoids confusing “preview doesn’t match runtime” cases.

### 3) Render “Metadata” fields (high-value subset first)

Use a mix of `ReadonlyPropertyRow` (copyable) and compact rows (like `MetadataRow`).

Recommended v1 fields:

- Names:
  - Family: `familyName`
  - Full name: `fullName`
  - Subfamily: `subfamilyName`
  - PostScript: `postscriptName`
  - Version: `version`
- File:
  - Type: `type`
  - Size: `prettyBytes(fileSize)` (when available)
- Coverage:
  - Glyphs: `numGlyphs`
  - Character set size: `characterSet.length`
  - Character sample (truncated): derived from `characterSet` (printable chars only)
- Metrics:
  - unitsPerEm
  - ascent, descent, lineGap
  - capHeight / xHeight (if present)
  - italicAngle
  - underlinePosition / underlineThickness
  - Suggested line-height multiplier:
    - `(ascent - descent + lineGap) / unitsPerEm` (formatted to ~2 decimals)
- Loaded status:
  - from `document.fonts.check(...)` if available

### 4) Compute “coverage badges” (optional but very useful)

From `characterSet` (unicode codepoints), derive boolean flags for common ranges:

- Basic Latin: U+0020–U+007E
- Digits: U+0030–U+0039
- Latin-1 Supplement: U+00A0–U+00FF
- Cyrillic: U+0400–U+04FF
- Greek: U+0370–U+03FF
- Currency: U+20A0–U+20CF

Render as small chips/badges (Mantine `Badge` or `Pill` style).

### 5) Show available OpenType features (read-only)

`availableFeatures` is currently `unknown` in the contract schema, so we must treat it defensively:

- If it is an array of strings: show as a list of tags.
- If it is an object/map: show keys.
- Otherwise: show “(unavailable)” or omit.

Return-early guard clause style:

- If no recognizable structure, don’t render this subsection.

### 6) Wire it into `InspectorPanel.tsx`

In `getAssetSections()` inside `src/components/inspector/InspectorPanel.tsx`:

- Extend the `match(item)` to add:
  - `.with({ type: 'web-font' }, (webFont) => [{ type: 'asset-web-font', title: 'Web Font', icon: Type, content: <WebFontSection data={webFont} />, defaultExpanded: true }])`
- Choose an icon from `lucide-react` (likely `Type` or `TypeOutline`).

### 7) Improve picker labeling (recommended follow-up)

Problem:

- `AssetPicker` labels web fonts as `asset.fontFamily` only (`AssetPicker.tsx`), which collapses variants (Regular/Bold/Italic) into identical labels.

Two approaches:

- **A)** Extend `AssetTreeWebFontData` to include `fullName` + `subfamilyName`, populated in `build-asset-tree.ts` (we already parse there).
  - Update label in `AssetPicker.getAssetLabel()` to prefer `fullName` (fallback `fontFamily`).
- **B)** Keep the tree type minimal and compute labels on demand (slower and more complex).

Plan decision:

- Prefer **A** (store more metadata at asset build time; it’s already available).

### 8) (Optional) “Where used” info

Add a small subsection:

- “Used by N Text objects”
- List object names/ids that have `style.fontFamily === asset.fontFamily`

This requires access to the canvas snapshot (`state.canvas`) and the object list shape (not part of this v1 plan unless we confirm it’s easy to query).

## Edge cases / failure modes

- Font parsing fails (unsupported format, corrupted file):
  - Render an error message instead of crashing; don’t throw from the effect.
- Font collections are unsupported (`.ttc`) and backend throws “Font collection is not supported”:
  - Show a clear message and consider making the asset builder treat it as generic `file`.
- Very large `characterSet`:
  - Never render all chars; show a truncated sample and counts.
- `availableFeatures` shape unknown:
  - Render only when we can safely interpret it.
- `document.fonts` not available:
  - Hide “Loaded status” or show “unknown”.

## Test plan (manual)

- Import a `woff2` / `ttf` into assets so it becomes a `web-font`.
- Select the font asset:
  - Inspector shows the new section.
  - Preview text visually changes when adjusting sample text and size.
  - Metadata matches the parsed values (family/full name/version/type).
  - File size displays and updates on asset change.
- Select a `Text` object and pick that font via `TextSection`’s `AssetPicker`:
  - The Text object renders with the font (existing behavior).
- (If we implement label improvement) import multiple variants from same family:
  - Picker labels are disambiguated (e.g. “Inter Regular”, “Inter Bold”).

