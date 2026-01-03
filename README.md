# Tekton Editor

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
- **valtio** for state management

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

## External control

The editor exposes a small dev-only control surface for automation/testing.

See [`docs/features/editorctl/editor-control.md`](docs/features/editorctl/editor-control.md).
