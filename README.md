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
- **Preload** exposes a narrow `window.mainApi` API via `contextBridge`.
- **Renderer** (React + Phaser) calls `mainApi.*` for all filesystem work using typed IPC.

### Main + Preload + Renderer working in tandem (Electron process model)

Electron runs the app in **multiple isolated contexts** that collaborate through a small, typed IPC surface:

- **Main (Node, privileged)**: creates the `BrowserWindow` and registers IPC handlers.
    - Window security is locked down (`contextIsolation: true`, `nodeIntegration: false`) in `src/main/main.ts`.
    - The main-process “service layer” is exposed as a set of `ipcMain.handle(...)` handlers in `src/main/ipc/register-main-api-handlers.ts`.
- **Preload (bridge, minimal surface area)**: runs in an isolated context and safely exposes APIs to the renderer.
    - `src/preload/preload.ts` uses `contextBridge.exposeInMainWorld(...)` to attach `window.mainApi`.
    - `src/preload/create-main-api.ts` implements `window.mainApi.<method>` by forwarding to main via `ipcRenderer.invoke('main-api:<method>', input)`.
- **Renderer (UI, unprivileged)**: the React + Phaser app. It never touches the filesystem directly.
    - Renderer code calls `mainApi.<method>(...)` via `src/renderer/main-api/main-api.ts`, which validates **inputs and outputs** against the shared Zod contract.

The contract lives in one place:

- **`src/shared/main-api/MainApi.ts`** defines `mainApiContract` (Zod schemas) and derives the `MainApi` TypeScript type from it.

#### End-to-end call path (example)

Renderer → Preload → Main:

1. Renderer calls `mainApi.readFile({ path })` (validated) (`src/renderer/main-api/main-api.ts`)
2. Preload forwards via `ipcRenderer.invoke('main-api:readFile', input)` (`src/preload/create-main-api.ts`)
3. Main receives it in `ipcMain.handle('main-api:readFile', ...)`, validates again, runs the handler, validates output, returns (`src/main/ipc/register-main-api-handlers.ts`)

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
- `npm run build-types`: build published type exports (`exports.d.ts`)
- `npm run update-types`: build + push updated types

## Type exports (`exports.d.ts`)

This repo maintains a **small, stable, public TypeScript “surface area”** that other projects can depend on (most importantly: the **prefab JSON types** like `PrefabFile`, `EditableObjectJson`, etc.).

- **`src/types/exports/exports.ts`**: the _source entrypoint_ for what we consider “public types”. It intentionally re-exports a curated set of types and uses **relative imports** (no path aliases) so the declarations can be bundled cleanly for consumers.
- **`exports.d.ts` (repo root)**: the _generated_ and _bundled_ declaration file. It is referenced from `package.json` via `"types": "exports.d.ts"` and included via `"files": ["exports.d.ts"]`, so TypeScript consumers get types by default.

### Why do we need this?

The app itself is an Electron + Vite project and isn’t set up to publish/consume its full source as a typed library. We still want:

- **A shared contract**: external tooling/runtime code can typecheck against the prefab format without importing the whole editor.
- **A single importable `.d.ts`**: downstream consumers shouldn’t need our TS config, path aliases, or build pipeline to get accurate types.
- **Controlled API surface**: exporting everything from `src/` would leak internal editor implementation details and be harder to evolve safely.
- **GitHub dependency friendly**: some projects consume this repo directly via a Git dependency (e.g. `"phaser-ui-editor": "github:vforsh/phaser-ui-editor"`). In that flow, the safest approach is to **commit `exports.d.ts`** so consumers get types immediately without needing to run our type-bundling pipeline.

### `build-types` / `update-types`

- **`npm run build-types`** (`node scripts/build-types.ts`):
    - Runs `tsc -p tsconfig.dts.json` to emit declarations into `dist/types/`
    - Bundles declarations starting from the compiled entrypoint `dist/types/src/types/exports/exports.d.ts` using `dtsroll`
    - Formats the bundled output and writes it to the repo root as `exports.d.ts`

- **`npm run update-types`** (`node scripts/build-types.ts --push`):
    - Does everything `build-types` does
    - If `exports.d.ts` changed, it **stages, commits, and pushes** the update so GitHub consumers pick it up (skips if there are no changes)

## Project structure (high level)

- `src/main/`: Electron main process entrypoint and services
- `src/preload/`: preload entrypoint
- `src/renderer/components/assetsPanel/`: Assets Panel UI
- `src/renderer/components/canvas/`: React wrapper for Phaser + canvas controls
    - `src/renderer/components/canvas/phaser/`: Phaser app/scene/editor logic
- `src/backend/contract/`: shared IPC contract + schemas
- `src/main/ipc/`: Electron main-process IPC handlers/services
- `src/preload/`: preload bridge (`window.mainApi`)
- `src/renderer/main-api/`: renderer IPC client wrapper
- `src/renderer/components/hierarchyPanel/`: Hierarchy tree UI
- `src/renderer/components/inspector/`: Inspector UI and sections
- `src/renderer/state/`: Valtio state + schemas
- `src/renderer/history/`: Undo/Redo hub and history domains
- `docs/`: internal documentation
- `scripts/`: build, release, and development scripts
- `tests/`: E2E and unit tests

## External control

The editor exposes a small dev-only control surface for automation/testing.

See [`docs/features/editorctl/editor-control.md`](docs/features/editorctl/editor-control.md).
