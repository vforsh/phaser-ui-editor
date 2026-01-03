# Phaser UI Editor

A desktop editor (Electron) for creating and editing **UI prefabs for Phaser 3 games**.

Visually and logically the editor is split into **4 main parts**:

- **Assets Panel**: manage project assets and open prefabs
- **Canvas**: Phaser-powered viewport where you create and manipulate UI objects
- **Hierarchy Panel**: tree view of objects in the currently opened prefab (two-way bound with canvas)
- **Inspector Panel**: property editor for the current selection (two-way bound with canvas/assets)

## Tech stack

- **Electron** (desktop shell)
- **electron-vite** (main + preload + renderer)
- **Vite** + **React** + **TypeScript** (renderer)
- **Mantine UI** (`@mantine/core`, `@mantine/hooks`)
- **Phaser** `3.87`
- **valtio** for reactive shared state

## How it works (high level)

- **Main process** owns filesystem access and heavy operations (image/font parsing, shell open).
- **Preload** exposes a narrow `window.backend` API via `contextBridge`.
- **Renderer** (React + Phaser) calls `backend.*` for all filesystem work using typed IPC.

## Getting started

Install dependencies:

```bash
npm install
```

Start Electron + Vite dev mode:

```bash
npm run dev
```

HTTPS dev server (mkcert):

```bash
# install mkcert once (macOS)
brew install mkcert nss

# install local CA and generate certs for localhost
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

# run the dev server (Electron loads https://localhost:5173)
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Typecheck / lint:

```bash
npm run typecheck
npm run lint
```

## Useful scripts

- `npm run dev`: start Electron + Vite dev (electron-vite)
- `npm run start`: alias for `npm run dev`
- `npm run editorctl -- <command>`: dev-only CLI control via JSON-RPC
- `npm run typecheck`: `tsc --noEmit` (app tsconfig)
- `npm run typecheck-dev`: typecheck in watch mode
- `npm run build`: production build (electron-vite)
- `npm run preview`: preview build output (electron-vite)
- `npm run test:paths`: run path normalization matrix
- `npm run build-types`: build published type exports (`exports.d.ts`)
- `npm run update-types`: build + push updated types

## Project structure (high level)

- `electron/`: Electron main + preload entrypoints
- `src/components/assetsPanel/`: Assets Panel UI
- `src/components/canvas/`: React wrapper for Phaser + canvas controls
  - `src/components/canvas/phaser/`: Phaser app/scene/editor logic
- `src/backend-contract/`: shared IPC contract + schemas
- `src/backend-main/`: Electron main-process IPC handlers/services
- `src/backend-preload/`: preload bridge (`window.backend`)
- `src/backend-renderer/`: renderer IPC client wrapper
- `src/components/hierarchyPanel/`: Hierarchy tree UI
- `src/components/inspector/`: Inspector UI and sections
- `src/state/`: Valtio state + schemas
- `src/history/`: Undo/Redo hub and history domains
- `docs/`: internal documentation

## External control (dev-only)

The editor exposes a small dev-only control surface for automation/testing.

### Window API (renderer)

Available in dev only as `window.editor`:

- `openProject({ path })`
- `openPrefab({ assetId?, path? })`
- `listHierarchy()`
- `selectObject({ id?, path? })`
- `switchToContext({ id?, path? })`
- `deleteObjects({ ids })`

### WebSocket JSON-RPC (main process)

In dev, Electron main starts a local WS server:

- `ws://127.0.0.1:17870` (default)
- Override with `EDITOR_CONTROL_WS_PORT=<port>`

Methods (JSON-RPC 2.0, camelCase):

- `openProject`
- `openPrefab`
- `listHierarchy`
- `selectObject`
- `switchToContext`
- `deleteObjects`

### CLI (`editorctl`)

```bash
# List hierarchy (prints JSON)
npm run editorctl -- listHierarchy

# Open prefab
npm run editorctl -- openPrefab --asset-id <id>
npm run editorctl -- openPrefab --path /abs/path/to/prefab.prefab

# Open project
npm run editorctl -- openProject --path /abs/path/to/project

# Select / switch context
npm run editorctl -- selectObject --id <id>
npm run editorctl -- selectObject --path root/menu/playButton
npm run editorctl -- switchToContext --id <id>
npm run editorctl -- switchToContext --path root/menu

# Delete
npm run editorctl -- deleteObjects --ids id1,id2,id3
```

## Documentation

- [App composition / architecture](./docs/app-composition.md)
- Features:
  - [Prefabs](./docs/features/prefabs.md)
  - [Hierarchy panel drag & drop](./docs/features/hierarchy-panel/drag-and-drop.md)
  - [Inspector: add component](./docs/features/inspector/add-component.md)
  - [Asset picker](./docs/features/asset-picker/asset-picker.md)
  - [Assets search](./docs/features/assets-search/assets-search.md)
