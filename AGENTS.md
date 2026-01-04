## Git Worktrees

- **Main checkout**: the primary working tree lives at `phaser-ui-editor/` (this repo).
- **Worktrees root**: additional worktrees are organized under the sibling directory `phaser-ui-editor-worktrees/`.
- **One folder per worktree**: each worktree should be created as its own subdirectory inside `phaser-ui-editor-worktrees/`, typically named after the branch/ticket, e.g.:

```bash
phaser-ui-editor-worktrees/
  feature-snap-to-grid/
  bugfix-inspector-zod/
  LIN-123-canvas-selection/
```

- **Conventions**:
    - Keep `master` (or the mainline branch) in `phaser-ui-editor/`; use worktrees for parallel feature/bugfix work.
    - Use `git worktree list` to see all linked worktrees.
    - Prefer short, unique directory names (branch/ticket), because the folder name becomes the “human” identity of that worktree.
    - When asked to create a new branch/worktree, use names like `feature/some-concise-desc` where the suffix is **kebab-case** and **~3–5 words max**. Common prefixes: `feature/`, `bugfix/`, `docs/` (e.g. `feature/dom-based-rulers`, `bugfix/inspector-zod-parse`, `docs/editorctl-overview`).
- After creating a new worktree, run `npm ci` inside that worktree (each worktree has its own `node_modules`).
- Use `fnm` to switch to the Node version specified in `package.json` before installing deps or running scripts.

## Worktrunk (`wt`) CLI

This repo supports managing worktrees via the `wt` CLI from Worktrunk: `https://github.com/max-sixty/worktrunk`.

Common commands:

```bash
wt list
wt switch <branch>        # jump to existing worktree for branch
wt switch -c <branch>     # create branch + worktree, then switch
wt remove                 # remove current worktree (and typically its branch)
```

## Typechecking

Agents MUST use:

```bash
npm run typecheck
```

Do NOT use `typecheck-dev` for one-shot typechecking (it’s watch mode).

## Running & testing the editor (agent workflow)

When implementing features that need runtime verification (Canvas/Hierarchy/Inspector behaviors, control RPC, etc.), use the running desktop editor instance and drive it via `editorctl`.

Docs: [`docs/features/editorctl/editorctl.md`](./docs/features/editorctl/editorctl.md)

### 1) Discover running editor instances (required first step)

Run:

```bash
npm run editorctl -- listEditors
```

### 2) If no editor is running, start one

If `listEditors` returns an empty list (no `editors`), start the editor:

```bash
npm start
```

Wait until the terminal prints a line like:

```text
[control-rpc] ws://127.0.0.1:<port>
```

Then run `npm run editorctl -- listEditors` again.

### 3) Choose the correct instance

If multiple entries are returned, select the correct one by:

- **`projectPath`**: ensure it matches the project you intend to test (default testbed: `/Users/vlad/dev/papa-cherry-2`)
- **`appLaunchDir`**: ensure it matches the worktree/checkout you are working in

### 4) Send commands to the discovered port

Almost no commands will work unless a project is open in that editor instance.

Use `/Users/vlad/dev/papa-cherry-2` (has `project.json5`) as the default **testbed project** for testing editor functionality:

```bash
npm run editorctl -- --port <wsPort> call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

Use the discovered **`wsPort`** for subsequent calls:

```bash
npm run editorctl -- --port <wsPort> call <method> '<json-params>'
```

Tip: use `projectPath` from `listEditors` to confirm the project is actually open.

## Renderer console logs → `logs/` (dev-only)

In development, the **main editor window** renderer `console.*` output is captured from the main process and written to per-run log files under `./logs`.

- **What’s captured**: renderer `console-message` events (log/info/warn/error/debug). This does **not** include uncaught errors / unhandled rejections.
- **Where**: `./logs/renderer-<runId>.log`
- **Line format**: `ISO_TIMESTAMP LEVEL: message` (no URL/line/window id)
- **Rotation**: 1MB max per file; keep 10 rotated files: `.log.1` … `.log.10`
- **When enabled**: dev only (`app.isPackaged === false`). Currently also disabled for Playwright E2E runs (`PW_E2E=1`).
- **Quirk**: because this uses Electron’s `console-message` (string payload), `console.log('label', someObject)` may show up as `label [object Object]` rather than a pretty/structured object dump. Capturing rich objects would require a preload + IPC bridge (or CDP).
