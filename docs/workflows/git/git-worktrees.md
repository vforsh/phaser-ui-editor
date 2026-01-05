# Git Worktrees via Worktrunk (`wt`)

## Overview

This project uses **Worktrunk** (`wt`) as the primary workflow for managing **Git worktrees**: one branch → one directory, fast switching, and consistent setup hooks.

Worktrunk configuration lives in two places ([docs](https://worktrunk.dev/config/)):

- **User config**: `~/.config/worktrunk/config.toml` (local-only, not committed)
- **Project config**: `.config/wt.toml` (committed, shared across the team)

## Current Repository Layout

- **Worktree root directory**: `~/dev/tekton-editor/`
- **Main worktree (default branch `master`)**: `~/dev/tekton-editor/tekton`
- **New worktrees** are created as siblings using the pattern:
    - `tekton.<branch-sanitized>`
    - Example: `~/dev/tekton-editor/tekton.feature-any-name`

## One-time Setup

### Prerequisites

- `wt` is installed and available in PATH: `wt --version`

### Shell integration (required)

Worktrunk needs shell integration to `cd` into the target worktree after switching:

```bash
wt config shell install
```

If you prefer manual setup, see Worktrunk docs: [Shell integration](https://worktrunk.dev/config/).

### User config: worktree path template (recommended for this repo layout)

Create/open your user config:

```bash
wt config create
wt config show
```

Then set the worktree path template so worktrees are created as siblings of the main worktree (i.e., in the parent directory of the main worktree):

```toml
# ~/.config/worktrunk/config.toml
worktree-path = "../{{ main_worktree }}.{{ branch | sanitize }}"
```

This matches the “siblings in parent directory” pattern from Worktrunk docs: [User config / worktree-path](https://worktrunk.dev/config/).

## Daily Usage

### List worktrees

```bash
wt list
```

### Create a new worktree for a branch

```bash
wt switch -c feature/my-branch
```

### Switch to an existing worktree

```bash
wt switch feature/my-branch
```

### Remove a worktree + branch

```bash
wt remove feature/my-branch
```

## Project Hooks (`.config/wt.toml`)

This repo includes a committed Worktrunk project config at `.config/wt.toml` that automates environment setup on worktree creation.

### post-create hooks (run on `wt switch -c ...`)

- **`env`**: if the new worktree has no `.env`, copy it from the `master` worktree
- **`editor-control-ws-port`**: ensure `EDITOR_CONTROL_WS_PORT` is unique per worktree
- **`install`**: `npm ci` in the repo root

### pre-merge hooks (run on `wt merge`)

- **`typecheck`**: `npm run tsc-check`
- **`lint`**: `npm run lint`
- **`test`**: `npm test`

## Merging a feature branch with `wt merge`

From inside a **feature worktree**, `wt merge` merges your branch into the **default branch** (usually `master`) and cleans up the worktree (similar to “Squash and merge” in GitHub/GitLab).

Basic usage:

```bash
# Merge into the default branch (usually master)
wt merge
```

### What `wt merge` does

Worktrunk runs a pipeline (details in the docs: <https://worktrunk.dev/merge/>):

- **Squash**: stages changes (by default) and squashes commits since target into one
- **Rebase**: rebases onto the target branch if needed
- **Pre-merge hooks**: runs `.config/wt.toml` `[pre-merge]` commands (tests/typecheck/lint in this repo)
- **Merge**: fast-forward merge to the target branch (non-fast-forward merges are rejected)
- **Cleanup**: removes the worktree and branch (unless disabled)

### Useful flags

```bash
# Auto-approve hook commands (non-interactive / first-time approval)
wt merge --yes

# Keep the worktree after merge
wt merge --no-remove

# Preserve commit history (no squash)
wt merge --no-squash

# Skip hooks (not recommended unless you have a reason)
wt merge --no-verify
```

## Hook approvals and non-interactive mode

On the first run, Worktrunk may ask you to approve hook commands for this repository.

- **Approve + proceed automatically**:

```bash
wt switch -c feature/my-branch --yes
```

- **Skip hooks** (when you intentionally don’t want them):

```bash
wt switch -c feature/my-branch --no-verify
```

See the Worktrunk docs for config and hooks details: <https://worktrunk.dev/config/>.
