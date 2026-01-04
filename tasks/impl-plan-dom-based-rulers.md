# Implementation plan: refactor Phaser rulers to DOM-based rulers + guides

Goal: replace the Phaser-based rulers in `src/components/canvas/phaser/scenes/main/Rulers.ts` with a **DOM overlay** implementation, preserving the current tick/label behavior and adding **interactive guides**:

- **Hover** over rulers shows a guide line preview
- **Click-drag** from rulers creates a guide and drags it
- **Right-click** clears guides

Constraints / decisions (from clarifications)

- **Where**: DOM overlay inside the Canvas area (absolute overlay inside `CanvasContainer`)
- **Coordinate space**: choose what fits best → **world-space** (tracks camera scroll + zoom) to match current behavior
- **Tick marks/labels**: **same as it is now** (match current algorithm/formatting)
- **Update strategy**: as you see fit → use **`requestAnimationFrame` + throttling** (not strict 60fps, but smooth enough)
- **Source of truth**: prefer event-driven from Phaser to React, but as you see fit → use a small **Phaser→React event bridge** plus `state.canvas.camera` as the canonical snapshot
- **Scope**: remove Phaser rulers codepaths entirely (**10b**)
- **Tests/SSR**: allowed to depend on Phaser runtime for camera state (**9b**)

---

## 1) Current behavior inventory (what we must preserve)

### 1.1 What exists today

- `MainScene` owns a `private rulers!: Rulers`
- It instantiates rulers in `create()` and redraws them from `onResizeOrCameraChange()`:
    - `this.rulers.redraw(gameSize, camera.zoom, camera.scrollX, camera.scrollY)`
    - `state.canvas.camera.{zoom,scrollX,scrollY}` is updated at the same time

### 1.2 What `Rulers.redraw()` currently does

File: `src/components/canvas/phaser/scenes/main/Rulers.ts`

- Renders **labels only** (no tick lines)
- Only **left** and **bottom** labels are active (right labels are commented out)
- Performance caveat: “hangs on large zoom” because it creates too many `Text` objects

Key calculations to preserve (v1 = exact match):

- `labelScale = Clamp(1 / cameraZoom, 0.5, 3)`
- `cellSize = Snap.Floor(Clamp(100 / cameraZoom, 25, 200), 50)`
- `rowsNum = (ceil(height / cellSize) + 1) * 2` (then capped to 100)
- `columnsNum = (ceil(width / cellSize) + 1) * 2` (then capped to 100)
- Uses `marginX = 5`, `marginY = 5`
- Visible origin math is currently:
    - `width = gameSize.width / cameraZoom`
    - `height = gameSize.height / cameraZoom`
    - `visibleLeft = cameraScrollX - width/2 + (width/2)*cameraZoom`
    - `visibleTop = cameraScrollY - height/2 + (height/2)*cameraZoom`

**Plan note:** the `visibleLeft/visibleTop` formula looks unusual vs Phaser’s typical camera worldView math, but “same as it is now” implies we should copy this exactly first, then optionally fix after we have parity.

---

## 2) Target architecture (DOM overlay, no Phaser GameObjects)

### 2.1 Rendering location

Implement a DOM overlay inside `src/components/canvas/CanvasContainer.tsx` (it already uses `position: relative` and hosts other overlays like drop previews and alignment controls).

Add a new overlay component tree, conceptually:

- `CanvasContainer`
    - `<Canvas />` (Phaser canvas element)
    - `<CanvasRulersOverlay />` (DOM-based rulers + guides; absolute positioned)

### 2.2 File/module layout (proposed)

Because the existing `Rulers.ts` lives under Phaser scene folders, the cleanest refactor is to:

- **Delete** the Phaser `Rulers` class and stop importing/instantiating it from `MainScene`
- Add new DOM modules under `src/components/canvas/rulers/` (or similar)

Proposed files:

- `src/components/canvas/rulers/CanvasRulersOverlay.tsx`
    - React component responsible for layout + event handling
- `src/components/canvas/rulers/rulers-model.ts`
    - Pure functions that compute tick/label positions from camera + size (ported from the current `Rulers.redraw()` logic)
- `src/components/canvas/rulers/guides-model.ts`
    - Guide storage shape and helpers (create/update/clear)
- `src/components/canvas/rulers/CanvasRulersOverlay.module.css`
    - Only if we need hover effects or cursor styling (per repo guidelines)

Alternative (less ideal, but minimal churn):

- Convert `src/components/canvas/phaser/scenes/main/Rulers.ts` into a DOM/React module and import it from `CanvasContainer`.
    - This keeps the filename stable but mixes DOM concerns under a Phaser directory.
    - Prefer the “move to `src/components/canvas/rulers/`” approach long-term.

---

## 3) Data flow: camera state + resize

### 3.1 Camera state source

Use `state.canvas.camera` as the camera snapshot (it is already updated from `MainScene.onResizeOrCameraChange()`).

To make updates more immediate and reduce reliance on incidental redraw calls:

- Emit a Phaser→React event on camera changes (event-driven), and in the handler update a lightweight local state/valtio field (or just force a recalculation).

Recommended approach:

- Add a Phaser app event like `camera-changed` emitted from `MainScene.onResizeOrCameraChange()`
    - Payload: `{ zoom, scrollX, scrollY }` + optionally `{ viewportW, viewportH }`
- React overlay subscribes to that event (via existing DI/event plumbing)
- React overlay also reads `state.canvas.camera` as a fallback/canonical snapshot

### 3.2 Canvas viewport size

In the DOM overlay, the “viewport” is the `CanvasContainer` content box:

- Track container size via `ResizeObserver` (or a Mantine hook if one is already standard in the repo).
- This is required for:
    - computing visible world area (via the existing formulas)
    - placing the bottom ruler at the correct screen y
    - pointer→world coordinate conversion for guides

---

## 4) Coordinate math (DOM overlay)

### 4.1 World ↔ screen conversion (for overlay placement)

We’ll treat the overlay coordinate system as CSS pixels in the canvas container (top-left origin).

For a world point `(wx, wy)` and camera `(zoom, scrollX, scrollY)`:

- `sx = (wx - scrollX) * zoom`
- `sy = (wy - scrollY) * zoom`

This is consistent with Phaser’s top-left scroll semantics and is the natural mapping for a DOM overlay.

### 4.2 Preserve current “visibleLeft/visibleTop” behavior

To match today exactly (v1 parity), port these calculations from `Rulers.redraw()`:

- `widthWorld = viewportW / zoom`
- `heightWorld = viewportH / zoom`
- `visibleLeft = scrollX - widthWorld/2 + (widthWorld/2)*zoom`
- `visibleTop = scrollY - heightWorld/2 + (heightWorld/2)*zoom`

Then when computing label positions we map world→screen using `visibleLeft/visibleTop` (or directly `scrollX/scrollY` if parity allows after validation).

Validation step (in plan below) ensures the DOM overlay matches what users see now.

---

## 5) DOM rulers rendering strategy

### 5.1 Layout (match current: left + bottom)

Render two ruler “bands”:

- **Left ruler band**: fixed width (e.g. 40–60px), full height
- **Bottom ruler band**: full width, fixed height (e.g. 30–40px)

They should:

- sit above the Phaser canvas
- not break existing overlays (drop preview, alignment controls)
- use the same styling cues as current:
    - background `#242424`
    - text color `rgba(255, 255, 255, 0.66)`
    - font family `Nunito` (DOM can use app font; Phaser currently hardcodes it)

### 5.2 Labels/ticks computation (ported 1:1 first)

Implement `computeRulerLabels(...)` in `rulers-model.ts`:

Inputs:

- `viewport: { width: number; height: number }` (CSS px)
- `camera: { zoom: number; scrollX: number; scrollY: number }`

Outputs:

- `leftLabels: Array<{ worldY: number; screenY: number; text: string; scale: number }>`
- `bottomLabels: Array<{ worldX: number; screenX: number; text: string; scale: number }>`
- `cellSize`, `labelScale` (optional, for debugging)

Render:

- Map labels to absolutely positioned `<div>`s in each band
- Use `transform: translate(...) scale(labelScale)` or font-size scaling; keep parity with Phaser’s `setScale(labelScale)`

### 5.3 Performance controls

Current Phaser implementation has a TODO about hanging at high zoom; DOM can avoid the same pitfalls:

- Keep a hard cap similar to today’s `rowsNum/columnsNum <= 100` for parity (v1)
- Update labels on:
    - camera change events (throttled)
    - container resize (debounced)
- Use `requestAnimationFrame` scheduling to coalesce rapid input updates

Optional v2 optimization:

- Render ticks/labels into a small `<canvas>` (2D) in each band to avoid many DOM nodes.
    - Still “DOM-based” (no Phaser), but less interactive unless layered with a transparent pointer layer.

---

## 6) Guides (hover preview + drag-create + right-click clear)

### 6.1 Guide model

Store guides in a UI-only state (not exported to prefab initially):

- `guides: Array<{ id: string; orientation: 'vertical' | 'horizontal'; value: number /* world */ }>`

Decide persistence:

- v1: keep guides in-memory (React state) OR in `state.canvas` for persistence across UI changes.
- Recommended: add to `state.canvas` so it survives re-renders and can be extended later.

### 6.2 Hover guide preview

Behavior:

- When pointer is over:
    - left ruler band → preview **horizontal** guide at hovered world Y
    - bottom ruler band → preview **vertical** guide at hovered world X
- Render preview as a thin line across the viewport (above canvas), with `pointer-events: none`.

### 6.3 Drag to create guides

Behavior:

- Pointer down on ruler band starts drag:
    - Create a guide with orientation based on band
    - While dragging, update its world coordinate continuously
    - Pointer up finalizes
- Use pointer capture (`setPointerCapture`) so drag continues outside band.

Coordinate conversion:

- Convert pointer `(clientX, clientY)` to container-local `(x, y)` via `getBoundingClientRect()`
- Convert to world coordinate:
    - For horizontal guide (from left ruler): `worldY = scrollY + y / zoom`
    - For vertical guide (from bottom ruler): `worldX = scrollX + x / zoom`

### 6.4 Right-click clears guides

Behavior:

- Context menu (`onContextMenu`) on either band:
    - prevent default
    - clear all guides

### 6.5 Rendering guides

Render guides as overlay lines positioned via world→screen mapping:

- Vertical guide at worldX:
    - `screenX = (worldX - scrollX) * zoom`
    - line spans full viewport height
- Horizontal guide at worldY:
    - `screenY = (worldY - scrollY) * zoom`
    - line spans full viewport width

Include:

- active/dragged guide styling (slightly brighter)
- optional hover highlighting if pointer is near an existing guide (future)

---

## 7) Integration steps (code change checklist)

### 7.1 Add DOM overlay component

- Add `CanvasRulersOverlay` to `CanvasContainer.tsx` as an absolutely positioned overlay.
- Ensure z-index ordering:
    - guides/rulers should appear above canvas, but not block asset drop preview if that’s more important (decide layering explicitly).

### 7.2 Provide camera-change events (Phaser → React)

- In `MainScene.onResizeOrCameraChange()` emit a typed event (via `PhaserAppEvents`) with the new camera state.
- React overlay subscribes and triggers a re-render/measurement update.

### 7.3 Remove Phaser rulers codepath entirely

- In `MainScene.ts`:
    - Remove `import { Rulers } from './Rulers'`
    - Remove `private rulers!: Rulers`
    - Remove instantiation in `create()`
    - Remove `this.rulers.redraw(...)` call from `onResizeOrCameraChange()`
- Delete `src/components/canvas/phaser/scenes/main/Rulers.ts` (or keep only pure shared math moved elsewhere).

---

## 8) Validation / acceptance criteria

### 8.1 Visual parity (rulers)

- At camera zooms: `0.25`, `0.5`, `1`, `2`, `4`, `10`:
    - Labels appear in same places as before
    - Label values match (same `cellSize` behavior)
    - Label scaling matches (same `labelScale`)

### 8.2 Interaction behavior (guides)

- Hover on left ruler shows a horizontal preview line that tracks the pointer
- Hover on bottom ruler shows a vertical preview line
- Drag from left ruler creates a horizontal guide and it tracks pointer while dragging
- Drag from bottom ruler creates a vertical guide and it tracks pointer while dragging
- Right-click on rulers clears all guides (and does not open the browser context menu)

### 8.3 Performance

- Panning (middle mouse) and zooming (wheel) stays responsive
- Updates are coalesced (rAF/throttling) and do not create unbounded DOM nodes

---

## 9) Follow-ups (optional improvements after parity)

- Fix `cellSize` edge case at extreme zoom (avoid `Snap.Floor` producing `0`)
- Add tick lines (minor ticks + major ticks) to rulers (currently labels only)
- Add guide selection/move/delete and snapping behavior
- Persist guides per-prefab if desired (and decide whether they should export or remain editor-only)
