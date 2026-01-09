# Implementation plan: refactor `MainScene.create()` composition using Needle DI (container-only)

Target: `src/renderer/components/canvas/phaser/scenes/main/MainScene.ts`

Goal: make MainScene boot deterministic and reviewable by replacing the hand-rolled “`deps` bag + patch later” wiring with a **per-`MainScene` Needle DI `Container`** used as a **composition root** (no decorators, no `inject()`), while preserving behavior.

Needle DI reference: [Needle DI – Getting started](https://needle-di.io/getting-started.html)

---

## 0) Constraints / decisions (from Vlad)

- **Scope**: refactor wiring + allow changing constructors of the created services (**1b**).
- **Container lifetime**: **per `MainScene` instance** (**2a**).
- **Injection style**: **no decorators**, no `inject()`. Use explicit `container.bind({ provide, useValue/useFactory })` + `container.get(...)` (**3b**, **4**).
- **Replace `deps`**: remove the `MainSceneDeps` bag and use DI-driven construction instead (**5c**).
- **Ordering**: must preserve correct invariants; do not guess (**6**).
- **State writes**: free to keep/move as needed (**7**).
- **Tests**: add/adjust automated test (**8c**).

---

## 1) Current boot flow & real ordering invariants (what must remain true)

This section is the “no mistakes” contract: what the current code requires to not crash, based on static dependency reads.

### 1.1 Early invariants (hard guards)

- `initData` must exist before anything else (guard already present).
- `logger` must be ready before most subsystems (everything logs).

### 1.2 Subsystem dependency map (from code)

**Prefab load / root setup**

- `MainScenePrefabPersistence.initRoot()` requires:
    - `assetLoader` (loads prefab assets when prefab has content)
    - `objectsFactory` (constructs runtime objects from prefab json)
    - `getSuperRoot()` and `setRoot()` (adds root into superRoot and stores it)
    - `editContexts` (switches to root context)

**Undo/history**

- `MainSceneHistory` is safe to create before `state.canvas.root` is set because it:
    - subscribes to `state.canvas.root` if present, and
    - also subscribes to `state.canvas` to re-sync subscription whenever `root` changes.
- BUT: `setBaseline()` must happen after the “new document reset” of revision counters (currently done late in `create()`).

**Ops**

- `MainSceneOps` requires `history`, `objectsFactory`, `componentsFactory`, `assetLoader`, `editContexts`, `aligner`, `clipboard`, etc.

**Pointer/keyboard input**

- `MainScenePointerInput.install()` registers pointer listeners that call:
    - `deps.history.captureSnapshot()` (so `history` must exist before `install()`)
    - `deps.cameraService.zoomToPointer()` and `deps.cameraService.onResizeOrCameraChange()` (so `cameraService` must exist before `install()`)
    - `deps.editContexts` / `deps.getSuperRoot()` on selection & double-click navigation
- `MainSceneKeyboardInput.install()` registers handlers that call `ops`, `persistence`, `cameraService`, etc. So it must be installed after those exist.

**Camera change pipeline**

- `MainSceneCamera.onResizeOrCameraChange()` redraws `grid` and `rulers`, and writes `state.canvas.camera.*`.
- Therefore, any code path that can call `onResizeOrCameraChange()` must only run after `grid` and `rulers` exist.
    - In current code, this includes:
        - pointer panning (middle mouse)
        - wheel zoom path
        - `MainScene.create()` initial `this.onResizeOrCameraChange(...)`

**Context frame**

- `EditContextFrame` requires an active `EditContext` (it’s constructed from `this.editContexts.current!` today), which only exists after `initRoot()` switches to a context.
- `MainSceneCamera.alignToContextFrame()` currently reads `contextFrame` in an optional way and _warns+returns_ if not ready.
    - In current boot sequence, `alignToContextFrame()` is called **before** `contextFrame` is created, so on a fresh default camera it is effectively a **no-op + warning**.
    - This is either an existing behavior bug or an intentional “best effort.” We should preserve this behavior initially for safety; fixing it can be a follow-up once we agree on expected UX.

### 1.3 External/control-rpc invariants

- Control RPC `setCamera` works by emitting app command `set-camera`. That requires:
    - `MainScene.setupAppCommands()` has been called
    - `MainSceneCamera` exists (listener calls `cameraService.setCamera()`)
- Therefore: we must not regress “after `openPrefab`, calling `setCamera` succeeds and updates `state.canvas.camera`”.

---

## 2) Target architecture: MainScene as a composition root (Needle DI, no decorators)

### 2.1 Why Needle DI here (and what we will NOT do)

- We’ll use Needle DI **only** to make construction + ordering explicit via a container.
- We will **not** use `@injectable` or `inject()` (no decorators, no injection context magic).
- We will **not** turn the container into a global service locator. The goal is to keep dependencies explicit and local to the scene.

### 2.2 Container design (per scene)

Create a `Container` at the top of `MainScene.create()`. Bind:

- **Values** (`useValue`):
    - scene (`MainScene` / `Phaser.Scene`)
    - `logger`
    - `shutdownSignal`
    - `sceneInitData`
    - `grid`, `rulers`
- **Mutable references** (as small store objects):
    - `rootRef: { get(): EditableContainer | undefined; set(root): void }`
    - `superRootRef: { get(): EditableContainer }`
    - `contextFrameRef: { get(): EditContextFrame | undefined; set(frame): void }` (optional/late)
- **Factories / services** (`useFactory`):
    - `componentsFactory`, `objectsFactory`, `layoutSystem`, `clipboard`, `editContexts`, `aligner`
    - `assetLoader`, `history`, `persistence`, `ops`, `screenshot`, `cameraService`
    - `keyboardInput`, `pointerInput`

Implementation sketch (API-accurate):

- Needle DI providers support `useValue` and `useFactory(container)` (see `@needle-di/core` typings).
- We’ll define a `MAIN_SCENE_TOKENS` object of `InjectionToken<T>` values in a new module, similar to `src/renderer/di/tokens.ts`.

### 2.3 Avoiding the old “deps bag”

Instead of a single `MainSceneDeps` param on everything, move to **small option objects** per class, e.g.:

- `new MainSceneCamera({ scene, logger, grid, rulers, getContextFrame })`
- `new MainScenePrefabPersistence({ sceneInitData, assetLoader, objectsFactory, editContexts, getSuperRoot, setRoot, rootToJson, history, logger })`
- `new MainScenePointerInput({ scene, logger, shutdownSignal, editContexts, history, cameraService, getSuperRoot, onResizeOrCameraChange })`

Rule: each service gets what it actually needs. If something is optional/late (like `contextFrame`), pass a **getter** or an **optional token**.

---

## 3) Concrete refactor steps (small, safe increments)

### 3.1 Introduce MainScene DI tokens + container builder

Add a new module near the scene implementation, e.g.:

- `src/renderer/components/canvas/phaser/scenes/main/mainScene/mainSceneDiTokens.ts`
- `src/renderer/components/canvas/phaser/scenes/main/mainScene/createMainSceneContainer.ts`

`createMainSceneContainer()` should:

- accept `{ scene, logger, shutdownSignal, sceneInitData }`
- create `new Container()`
- bind core tokens and return `{ container, refs }`

Keep this as the only place that “knows everything” about construction.

### 3.2 Convert services off `MainSceneDeps` (start with leafiest → most central)

Refactor constructor signatures to accept explicit options:

- `MainSceneAssetLoader`
- `MainScenePrefabPersistence`
- `MainSceneCamera` (replace `deps` usage; pass `getContextFrame` and `onResizeOrCameraChange` explicitly)
- `MainSceneHistory` (pass `shutdownSignal`, `editContexts`, `objectsFactory`, and accessors used during snapshot restore)
- `MainSceneOps` (split its internal construction too if needed; keep option objects small)
- `MainSceneKeyboardInput`, `MainScenePointerInput`
- `MainSceneScreenshot` (if it currently depends on `deps`)

Guard-clause rule: prefer early returns over deep nesting (workspace convention).

### 3.3 Rebuild `MainScene.create()` as a small, ordered boot script

Target end-state: `create()` reads top-to-bottom like this:

- validate init data
- create `grid`, `rulers` + add to scene
- create container + bind base values
- create factories/system components
- create `superRoot` and bind into `superRootRef`
- build/pull services from container (`assetLoader`, `history`, `persistence`, `ops`, `cameraService`, etc.)
- install input
- `await persistence.initRoot(...)`
- update `state.canvas.currentPrefab` / recent list
- create `aligner`
- create `contextFrame` from `editContexts.current` and bind into `contextFrameRef`
- install `ContextDimming`
- wire resize listener
- apply camera state from `state.canvas.camera`
- call `onResizeOrCameraChange(...)`
- preserve current “default camera alignment is best effort” semantics (see 1.2)
- `setupAppCommands()`
- reset revision counters + publish state pointers (`root`, `objectById`, `siblingIds`)
- `history.setBaseline()`
- mark “scene ready” state

Important: remove the “patch `deps.contextFrame` later” comment by design (late binding happens via ref/getter).

### 3.4 Update `onShutdown()` to fully release references

- Keep current teardown ordering (destroy overlays, editContexts, clipboard, factories).
- Add:
    - clear scene DI container reference (so nothing accidentally retains the scene)
    - clear `rootRef`/`contextFrameRef` if they are held outside the container

---

## 4) Testing plan (automated regression guard)

We’ll extend the existing Playwright E2E smoke suite to assert MainScene readiness and basic command plumbing after `openPrefab`.

### 4.1 Update `tekton.launch.smoke.spec.ts`

File: `tests/e2e/specs/tekton.launch.smoke.spec.ts`

Add a new `test.step` immediately after `openPrefab`:

- Poll `getCanvasState` until:
    - `mainSceneReadyPrefabAssetId === openedPrefabId`
    - `mainSceneReadyAt` is non-null
    - `root` is non-null
- Then verify command wiring by calling `setCamera` and observing `state.canvas.camera` changes:
    - `await windowEditor.call(page, 'setCamera', { zoom: 2, scrollX: 123, scrollY: 456 })`
    - poll `getCanvasState` until `camera.zoom/scrollX/scrollY` match
- Finally keep existing `listHierarchy` step (sanity that the scene stayed healthy).

Why this test catches ordering regressions:

- If `setupAppCommands()` is accidentally delayed/removed, `setCamera` won’t take effect.
- If `cameraService`/`grid`/`rulers` construction order is wrong, `onResizeOrCameraChange` paths will throw or fail to update state.
- If `persistence.initRoot()` runs before required bindings (assetLoader/objectsFactory/editContexts/superRoot), readiness won’t be reached.

---

## 5) Risks & mitigations

- **Risk: accidental behavior change in initial camera alignment**
    - Mitigation: preserve current semantics (attempt align before contextFrame exists) in the first pass; only “fix” it if we explicitly decide to.
- **Risk: subtle reliance on side-effects of `MainSceneDeps` bag mutation**
    - Mitigation: introduce explicit refs/getters for mutable/late values (`root`, `contextFrame`) and remove mutation patterns.
- **Risk: increased churn from constructor refactors**
    - Mitigation: do it in a tight sequence and keep each service options interface small; avoid changing behavior inside methods.

---

## Final checklist

After implementation, run `npm run typecheck` and `npm run lint` and fix any errors found (use `npm run lint:fix` when appropriate).
