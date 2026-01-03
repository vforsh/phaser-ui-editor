
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
  - Use `/Users/vlad/dev/papa-cherry-2` (has `project.json5`) as the default **testbed project** for testing editor functionality. To open it via `editorctl`, use:
    - `npm run editorctl -- call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'`
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
