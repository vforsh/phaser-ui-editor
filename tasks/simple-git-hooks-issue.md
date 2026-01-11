# simple-git-hooks issue (npm install)

## Summary

`npm install` runs the `prepare` script (`simple-git-hooks`) and fails to install hooks because the worktree doesn't have a `.git/` directory. The install still completes, but the hook setup is skipped.

## Error

```
[ERROR], Was not able to set git hooks. Error: Error: ENOTDIR: not a directory, mkdir '/Users/vlad/dev/tekton-editor/tekton.refactor-extract-layout-system-to-runtime/.git/hooks'
```

## Impact

- Hooks are not installed in this worktree.
- Package install succeeds; no dependency changes blocked.

## Cause

This worktree appears to be a git worktree that doesn't have a local `.git/` directory (likely uses a `.git` file pointing to the main repo). `simple-git-hooks` expects `.git/hooks` to exist as a directory.

## Suggested fixes

- Run installs from the main checkout that has `.git/` directory (e.g. `~/dev/tekton-editor/tekton`).
- Or temporarily disable `prepare` via env when running npm install: `HUSKY=0 npm install` (or adjust `simple-git-hooks` config) if appropriate.
