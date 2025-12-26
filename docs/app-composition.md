### App composition (high level)

The editor is a **React + Mantine** application that embeds a **Phaser 3** game instance as the interactive canvas. Visually and logically it’s split into **4 main parts**:

- **Assets Panel**: browse/manage project assets and open prefabs.
- **Canvas**: the Phaser-powered viewport where you create and manipulate UI objects.
- **Hierarchy Panel**: a tree view of objects in the currently opened prefab (two-way with canvas).
- **Inspector Panel**: property editor for the current selection (two-way with canvas/assets).

At runtime, the app is “glued” together by:

- **DI container** (created once in `App.tsx`) to share emitters/services across components.
- **Command/Event emitters** for app-level communication.
- **Global state** via **valtio** (`state`) for reactive shared data (selection, hover, prefab, etc.).
- **Undo/Redo hub** (`UndoHub`) owned by the React app and passed into Phaser.

### App root (`src/App.tsx`)

`App.tsx` is responsible for **one-time composition**:

- **Mantine** setup (`MantineProvider`, `Notifications`, `ContextMenuProvider`).
- Creates a DI container (`createContainer()`), then registers:
  - `TOKENS.AppEvents`: `TypedEventEmitter<AppEvents>()`
  - `TOKENS.AppCommands`: `CommandEmitter<AppCommands>('app')`
  - `TOKENS.UndoHub`: `UndoHub` instance
- Wires `UndoHub` state changes into valtio:
  - `onChange(historyState) => state.app.history = historyState`
- Renders the main editor layout (`EditorLayout`), which hosts the four panels.

The important idea: **React owns the “application services”**, and Phaser is a “client” of those services (it receives app commands, emits events back, and mutates shared state).

### Canvas (React wrapper) (`src/components/canvas/Canvas.tsx`)

`Canvas.tsx` is the **React wrapper around Phaser**:

- Creates a `<canvas id="canvas" tabIndex={0} />` so it can receive focus/keyboard.
- On mount (and when dependencies change), it creates a `PhaserApp` instance via `createPhaserApp(...)`.
- Injects the Phaser app’s own emitters into a shared “phaser scope”:
  - `phaserScope.events = phaserApp.ev3nts`
  - `phaserScope.commands = phaserApp.commands`
- Ensures proper cleanup on unmount: destroys emitters and the Phaser game instance.

Conceptually:

- React provides **configuration + app-level emitters + UndoHub**
- Phaser provides **scene logic + object editing + canvas interactions**

### Phaser app (`src/components/canvas/phaser/PhaserApp.ts`)

`PhaserApp` extends `Phaser.Game` and is the **bridge** between React and Phaser scenes.

Key responsibilities:

- **Holds references** to:
  - `appEvents` (from React) — events Phaser can listen to
  - `appCommands` (from React) — commands Phaser can react to
  - `ev3nts` (to React) — Phaser → React events
  - `commands` (to scenes/tools) — internal Phaser command bus
  - `undoHub` — undo/redo service owned by React
- **Binds app commands**:
  - `'open-prefab'` → `openPrefab(prefabAssetId)`
  - `'discard-unsaved-prefab'` → `discardUnsavedPrefab()`
  - `'undo'/'redo'` → delegates to `undoHub.undo()` / `undoHub.redo()`
- **Scene setup**:
  - Registers `MainScene` (the editor scene) and optionally `TestScene`.
  - Starts `MainScene` by loading a prefab file via `trpc.readJson` when requested.
- **Scaling**:
  - Uses `ResizeSensor` + debounced handler to keep Phaser’s scale in sync with the canvas container.
- **Prefab lifecycle**:
  - Avoids reopening the same prefab if it’s already active.
  - If there are unsaved changes, prompts to save before switching prefabs.
  - Updates `state.canvas.lastOpenedPrefabAssetId` so the app can auto-open it next time.

In practice, `MainScene` is where most “editor behavior” lives (selection, transforms, creation, serialization), but `PhaserApp` is the **entry point** that decides *which prefab is open* and *when scenes transition*.

### Hierarchy Panel (`src/components/hierarchyPanel/HierarchyPanel.tsx`)

`HierarchyPanel` renders a tree for the **currently opened prefab** by reading the reactive canvas snapshot:

- `useSnapshot(state.canvas)` drives rendering and keyboard behavior.
- `rootState` is resolved via `state.canvas.objectById(canvasSnap.root.id)` and is expected to be a `Container`.

Two-way binding mechanics:

- **Selecting in hierarchy** emits app commands (e.g. `appCommands.emit('select-object', objId)`), which the canvas/scene reacts to.
- **Canvas changes** (selection, hover, object graph updates) update valtio `state.canvas`, and the hierarchy re-renders accordingly.

Notable interaction patterns:

- **Keyboard navigation** (when the panel is focused):
  - Arrow keys move selection through visible items
  - Shift + arrows extends selection among siblings
  - Left/Right expands/collapses containers, or selects parent
  - `Cmd/Ctrl+S` saves current prefab if there are unsaved changes
  - `Delete/Backspace` deletes selected objects (`'delete-objects'`)
  - `F2` starts rename for the last selected item
- **Drag-and-drop re-parenting / reordering**:
  - Uses Atlaskit pragmatic DnD monitoring.
  - On drop, it computes the target parent/index and emits:
    - `appCommands.emit('move-object-in-hierarchy', sourceId, targetParentId, targetIndex)`

### Assets Panel (`src/components/assetsPanel/AssetsPanel.tsx`)

`AssetsPanel` manages **project assets** (folders, images, spritesheets, prefabs, etc.) and integrates:

- Selection and interaction via `state.assets` (valtio).
- Context menus (Mantine context menu provider).
- File operations through `trpc` (create folder, create prefab, rename, duplicate, delete, open in OS).

Key behaviors:

- **Open prefab**:
  - Double-click or Enter on a prefab triggers `appCommands.emit('open-prefab', prefabAssetId)`.
  - PhaserApp receives this command and loads/starts `MainScene` with that prefab.
- **Rename**:
  - Context menu “Rename” or `F2` (when panel is focused) enters rename mode.
  - Renaming calls `trpc.rename` and then updates `state.assets.items`.
- **Search mode**:
  - Maintains `isSearchMode`, `searchResults`, and keyboard navigation for results.
  - `Cmd/Ctrl+F` expands the search UI (currently handled here; TODO suggests moving to `EditorLayout`).
- **Create asset items**:
  - “Create Folder” / “Create Prefab” perform filesystem writes via `trpc.*` and then update the in-memory asset tree.

### Inspector Panel (conceptual)

The inspector is the property editor for whatever is currently selected:

- If you selected an **asset** in Assets Panel, inspector shows asset details/actions.
- If you selected a **game object** (via Canvas or Hierarchy), inspector shows editable components/fields for that object.

Two-way binding follows the same pattern:

- Inspector edits mutate shared valtio state and/or emit app commands.
- Canvas reacts by updating Phaser objects; Phaser-driven changes update state and the inspector reflects them.

### Data & control flow (mental model)

- **React UI → Phaser**:
  - Panels emit `AppCommands` (`CommandEmitter<AppCommands>`) via DI.
  - PhaserApp subscribes to relevant commands and forwards to scenes / services.
- **Phaser → React UI**:
  - Phaser emits `PhaserAppEvents` (`ev3nts`) and mutates shared valtio `state` for reactive UI updates.
- **Shared truth**:
  - `state` (valtio) is the “live snapshot” used by panels and (in parts) by Phaser logic.
- **History**:
  - `UndoHub` is created at the app root, passed into Phaser, and its state is reflected in `state.app.history`.


