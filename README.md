# Phaser UI Editor

A web-based editor for creating and editing **UI prefabs for Phaser 3 games**.

Visually and logically the editor is split into **4 main parts**:

- **Assets Panel**: manage project assets and open prefabs
- **Canvas**: Phaser-powered viewport where you create and manipulate UI objects
- **Hierarchy Panel**: tree view of objects in the currently opened prefab (two-way bound with canvas)
- **Inspector Panel**: property editor for the current selection (two-way bound with canvas/assets)

## Tech stack

- **Vite** + **React** + **TypeScript**
- **Mantine UI** (`@mantine/core`, `@mantine/hooks`)
- **Phaser** `3.87`
- **valtio** for reactive shared state

## Getting started

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run start
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

- `npm run start`: start Vite dev server (uses `vite --host`)
- `npm run typecheck`: `tsc --noEmit` (app tsconfig)
- `npm run typecheck-dev`: typecheck in watch mode
- `npm run build`: production build
- `npm run preview`: preview build output
- `npm run build-types`: build published type exports (`exports.d.ts`)
- `npm run update-types`: build + push updated types

## Project structure (high level)

- `src/components/assetsPanel/`: Assets Panel UI
- `src/components/canvas/`: React wrapper for Phaser + canvas controls
  - `src/components/canvas/phaser/`: Phaser app/scene/editor logic
- `src/components/hierarchyPanel/`: Hierarchy tree UI
- `src/components/inspector/`: Inspector UI and sections
- `src/state/`: Valtio state + schemas
- `src/history/`: Undo/Redo hub and history domains
- `docs/`: internal documentation

## Documentation

- [App composition / architecture](./docs/app-composition.md)
- Features:
  - [Prefabs](./docs/features/prefabs.md)
  - [Hierarchy panel drag & drop](./docs/features/hierarchy-panel/drag-and-drop.md)
  - [Inspector: add component](./docs/features/inspector/add-component.md)
  - [Asset picker](./docs/features/asset-picker/asset-picker.md)
  - [Assets search](./docs/features/assets-search/assets-search.md)

