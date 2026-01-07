## Agent Protocol

- Keep files <~500 LOC; split/refactor as needed.
- For app UI, add `data-testid` to all **stable, large components** (anything we expect tests/automation to target long-term). Prefer stable IDs; don’t key off copy/labels/DOM structure.
- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- Never ship generic/squash placeholder messages (especially from `wt merge`): e.g. `Changes to 7 files` (see `cd52f7b49013d5592454f746a34ab60e14018ccd`). Always replace with a real Conventional Commit summary (and a short body when useful).
    - If `wt merge` proposes a default message, edit it before accepting.
    - If it does not prompt and produces a generic message, stop and **amend** before merging/pushing.
    - Prefer: `fix(inspector): validate zod schema on save` / `feat(canvas): add snap-to-grid toggles`
- Style: telegraph. Drop filler/grammar. Min tokens (global AGENTS + replies).

## Critical Thinking

- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Git Worktrees

- **Worktrees root**: worktrees are created as siblings under `~/dev/tekton-editor/`.
- **Main checkout**: the primary working tree lives at `~/dev/tekton-editor/tekton`.
- **One folder per worktree**: each worktree is named `tekton.<branch-sanitized>`, e.g.:

```bash
tekton-editor/
  tekton/
  tekton.feature-snap-to-grid/
  tekton.bugfix-inspector-zod/
  tekton.LIN-123-canvas-selection/
```

## Worktrunk (`wt`) CLI

This repo supports managing worktrees via the `wt` CLI from Worktrunk: `https://github.com/max-sixty/worktrunk`. Workflow details: `docs/workflows/git/git-worktrees.md`.

Common commands:

```bash
wt list
wt switch -c <branch> -y    # create branch + worktree, then switch
wt merge                    # merge current worktree into default branch (usually `master` or `main`)
```

## Typechecking

Agents MUST use:

```bash
npm run typecheck
```

Do NOT use `typecheck-dev` for one-shot typechecking (it’s watch mode).

## UI polish reviews (`eikon` CLI)

Use `eikon` to get a visual-polish critique of Tekton UI screenshots (spot inconsistencies, misalignments, spacing/typography issues).

In this repo, `editorctl` screenshot commands like `takeAppScreenshot` / `takeAppPartScreenshot` **save to `<projectDir>/screenshots` and return an absolute file path** — perfect for feeding directly into `eikon`.

Examples:

```bash
# Take a screenshot via editorctl, then run eikon on it (path printed in JSON output)
npm run editorctl -- --port <wsPort> call takeAppScreenshot '{"format":"png"}'
eikon /absolute/path/from/the/printed/json.png --preset web-ui

# Polished UI review preset (no prompt required)
eikon /absolute/path/to/screenshot.png --preset web-ui

# Layout-first pass (alignment/spacing/layout issues)
eikon /absolute/path/to/screenshot.png --preset web-ui-layout

# Add extra context for what you want reviewed
eikon /absolute/path/to/screenshot.png --preset web-ui "Focus on spacing + typography"
```

## Running & testing the editor (agent workflow)

When implementing features that need runtime verification (Canvas/Hierarchy/Inspector behaviors, control RPC, etc.), use the running desktop editor instance and drive it via `editorctl`.

Docs: [`docs/features/editorctl/editorctl.md`](./docs/features/editorctl/editorctl.md)

### `editorctl` CLI quick usage

- Always run `npm run build:packages` before using `editorctl` (fresh checkout or after contract changes).
- Prefer meta commands for discovery: `methods`, `schema <method>`, `call <method> '<json>'`.
- Always pass `--` before CLI args: `npm run editorctl -- ...`
- Use `--port <wsPort>` from `listEditors` for targeted calls.

### 1) Discover running editor instances (required first step)

Run:

```bash
npm run editorctl -- listEditors
```

### 2) If no editor is running, start one

If `listEditors` returns an empty list (no `editors`), start the editor:

```bash
# Prefer background start to NOT DISRUPT USER
npm run start:bg
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
