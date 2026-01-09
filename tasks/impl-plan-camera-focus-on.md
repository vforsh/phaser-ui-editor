## Impl plan: refactor camera focus to `focusOn(...)` + add control-rpc `focusOnObject`

### Goal

Refactor the MainScene camera “focus” APIs so we have **one core method**:

- **`MainSceneCamera.focusOn(target, options?)`**
    - Works for **any scene object** (structural “bounds provider”), plus Selection bounds.
    - Supports **optional zoom override**.
    - Supports **configurable padding** with a **10% default**.
    - Document behavior with **JSDoc**.

Then add a new control-rpc command:

- **`focusOnObject`** (params `{ id, zoom? }`, plus optional extras as needed)

Also update the `F` keyboard shortcut:

- Focus **current selection** (single object or selection bounds)
- If **no selection**, focus **current context frame**.

---

### Current state (what exists today)

- **Camera service**
    - `MainSceneCamera.alignToContextFrame()` (immediate scroll/zoom, uses `contextFrame.aabbSize`, 10% padding)
    - `MainSceneCamera.focusOnObject(objId: string)` (tween scroll/zoom to object bounds, currently hardcodes 20% padding + clamps zoom)

- **App command wiring**
    - App command exists: `'focus-on-object': (id: string) => void` (`src/renderer/AppCommands.ts`)
    - MainScene listens: `appCommands.on('focus-on-object', (id) => cameraService.focusOnObject(id), ...)` (`src/renderer/components/canvas/phaser/scenes/main/MainScene.ts`)
    - Hierarchy panel emits: `appCommands.emit('focus-on-object', objId)` (`src/renderer/components/hierarchyPanel/HierarchyItem.tsx`)

- **Keyboard**
    - `F` calls `cameraService.alignToContextFrame()` (`src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneKeyboardInput.ts`)

---

### Refactor design

#### 1) Introduce a “bounds provider” type (structural typing)

Create a local type in `MainSceneCamera.ts` (keep scope tight; don’t over-generalize):

- **`type FocusTarget = { getBounds(): Phaser.Geom.Rectangle } | { bounds: Phaser.Geom.Rectangle; centerX: number; centerY: number; width: number; height: number }`**
    - This covers:
        - Phaser objects like `EditableObject` and `EditContextFrame` (they have `getBounds()` at runtime).
        - `Selection` (has `bounds` + derived `centerX/centerY/width/height`).

Guard-clauses-first approach:

- If target cannot yield a finite bounds rectangle (width/height not finite), bail early and log at debug/warn.

#### 2) Define `FocusOnOptions`

In `MainSceneCamera.ts`:

- `type FocusOnOptions = {`
    - `zoom?: number` (if provided: **force zoom**, skip fit-zoom computation)
    - `paddingPct?: number` (default **0.1**; clamp \(0..0.9\))
    - `animate?: boolean` (default **false** for core `focusOn` to keep semantics stable/explicit)
    - `durationMs?: number` (default 100 when `animate: true`)
    - `maxZoom?: number` (optional; if set, clamp computed zoom to this)
    - `minZoom?: number` (optional; if set, clamp computed zoom to this)
- `}`

Notes:

- `alignToContextFrame()` currently has a special case where “no change” halves zoom; preserve this behavior only if it’s still needed after switching to bounds-based computation. If it is needed, gate it behind a named helper (e.g. `avoidNoopZoom`).

#### 3) Implement `focusOn(target, options?)`

Implementation outline inside `MainSceneCamera`:

- **Resolve bounds**
    - If `target` has `getBounds()`: use it.
    - Else use the `Selection`-like shape (`bounds` / `centerX` / etc).

- **Compute target center**
    - Center on **bounds center** (`bounds.centerX/centerY`) (matches existing `focusOnObject` semantics).

- **Compute zoom**
    - If `options.zoom != null`: use it.
    - Else compute a “fit zoom”:
        - `availableWidth = camera.width * (1 - paddingPct * 2)`
        - `availableHeight = camera.height * (1 - paddingPct * 2)`
        - `zoom = min(availableWidth / bounds.width, availableHeight / bounds.height)`
        - Clamp to `minZoom/maxZoom` if provided.

- **Apply**
    - If `animate`:
        - Tween `camera.zoom`, `camera.scrollX`, `camera.scrollY`
        - `onUpdate` calls `onResizeOrCameraChange()` (keeps grid/rulers/state synced)
    - Else:
        - Set `camera.zoom`, `camera.scrollX`, `camera.scrollY` directly
        - Call `onResizeOrCameraChange()` once

#### 4) Keep small wrappers for intentful callers

To avoid sprinkling selection/context-frame logic throughout the codebase:

- `focusOnContextFrame(options?)`
    - Reads `deps.contextFrame` (guard: if missing, warn + return)
    - Calls `focusOn(contextFrame, { ...defaults })`

- `focusOnObjectById(params: { id: string; zoom?: number; paddingPct?: number })`
    - Looks up object via `deps.objectsFactory.getObjectById(id)` (guard: missing -> return)
    - Calls `focusOn(obj, { zoom, paddingPct, animate: true, durationMs: 100 })`

Deprecation strategy (minimize churn, reduce break risk):

- Keep `alignToContextFrame()` as a thin wrapper calling `focusOnContextFrame()` **for now**, but update all internal callsites to prefer the new names.
- Keep the public surface area stable until downstream callers are migrated; remove the legacy method in a follow-up.

---

### Update keyboard shortcut (`F`)

File: `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneKeyboardInput.ts`

New behavior for `F`:

- If there is a selection in the current edit context:
    - If selection count is 1: focus on that object.
    - If selection count > 1: focus on selection bounds (so “focus selection” does something useful).
- Else: focus on context frame.

Preferred implementation:

- Add `MainSceneCamera.focusOnSelectionOrContextFrame()` and call that from the keyboard handler (keeps the shortcut logic in one place).

---

### Update app command plumbing to support zoom + padding (needed for control-rpc)

Currently `'focus-on-object'` only accepts a string id, but the new requirements want passing zoom (and padding).

Refactor the app command signature:

- In `src/renderer/AppCommands.ts`
    - Change:
        - `'focus-on-object': (id: string) => void`
    - To:
        - `'focus-on-object': (payload: { id: string; zoom?: number; paddingPct?: number }) => void`

Then update all emit/listen callsites:

- `src/renderer/components/canvas/phaser/scenes/main/MainScene.ts`
    - Update listener to pass payload through to camera service wrapper (e.g. `cameraService.focusOnObjectById(payload)`).
- `src/renderer/components/hierarchyPanel/HierarchyItem.tsx`
    - Update emitter to `appCommands.emit('focus-on-object', { id: objId })`.

This keeps the command name stable while enabling richer behavior.

---

### Add control-rpc command: `focusOnObject`

#### Contract (source of truth)

Add a new command definition:

- File: `packages/control-rpc-contract/src/commands/focusOnObject.ts`
    - Group: **`misc`** (camera-related, consistent with `setCamera`)
    - Kind: **`write`**
    - Input schema (per request):
        - `{ id: string, zoom?: number }`
    - Recommended optional extras (requested “as you see fit”):
        - `paddingPct?: number` (defaults to 0.1 in renderer)
    - Output:
        - `successSchema`

Wire it into the contract:

- `packages/control-rpc-contract/src/ControlApi.ts`
    - Import `focusOnObjectCommand`
    - Add `focusOnObject: focusOnObjectCommand` to `controlContract`

#### Renderer handler

Add a handler module:

- File: `src/renderer/control-rpc/service/handlers/focusOnObject.ts`
    - `ctx.appCommands.emit('focus-on-object', params)`
    - Return `{ success: true }`

Register it:

- File: `src/renderer/control-rpc/service/EditorControlService.ts`
    - Add `focusOnObject: focusOnObject(this.ctx)`

---

### Update docs: editor control overview

File: `docs/features/editorctl/editor-control-overview.md`

Add `focusOnObject` to the documented command list, near the camera commands (around `setCamera` or the “misc group” section).

Example usage (match `editorctl` style):

- `npm run editorctl -- --port <wsPort> call focusOnObject '{"id":"<objectId>","zoom":2}'`

Include a note:

- If `zoom` is omitted, focus uses “fit-to-bounds” zoom with default padding (10%).

---

### Rollout order (safe, low churn)

1. Implement `MainSceneCamera.focusOn(...)` + wrappers, keep legacy methods temporarily.
2. Switch `alignToContextFrame()` callsites (`MainScene.create`, keyboard `F`) to new methods.
3. Update app command signature for `'focus-on-object'` to take an object payload (update hierarchy panel + scene listener).
4. Add control-rpc contract + handler for `focusOnObject`.
5. Update docs (`editor-control-overview.md`) with `focusOnObject`.

---

### Final checklist

After implementing, run `npm run typecheck` and `npm run lint` (and fix any errors; use `npm run lint:fix` when appropriate).
