# Worktree from plan (wt)

Create a new git worktree for an implementation/refactor plan using the repo's Worktrunk (`wt`) workflow.

## Input (what the user types)

The user should provide:

- A plan file reference (required):
    - Repo-relative path (recommended): `@tasks/plan.md`
    - Absolute path (also allowed): `@/Users/vlad/dev/tekton-editor/tekton/tasks/plan.md`
- An optional post-create action (optional): `cursor` or `codex`

Examples:

- `/worktree-from-plan @tasks/impl-plan-editorctl-discover.md`
- `/worktree-from-plan @/Users/vlad/dev/tekton-editor/tekton/tasks/impl-plan-editorctl-discover.md`
- `/worktree-from-plan @tasks/impl-plan-editorctl-discover.md cursor`
- `/worktree-from-plan @tasks/impl-plan-editorctl-discover.md codex`

## Behavior

When invoked, do the following:

1. Read the plan file the user referenced (the `@...` path). Do not dive deep—just skim enough to understand the gist so you can propose a good branch name.

2. Normalize the plan path into both an absolute path and a repo-relative path:

- Capture the raw input as `PLAN_INPUT` (strip the leading `@`).
- Resolve `PLAN_ABS_PATH`:
    - If `PLAN_INPUT` starts with `/`: treat as absolute (`PLAN_ABS_PATH="$PLAN_INPUT"`).
    - Otherwise: treat as repo-relative (`PLAN_ABS_PATH="$PWD/$PLAN_INPUT"`).
- Derive `PLAN_REL_PATH`:
    - Require that `PLAN_ABS_PATH` is inside the current repo root (`$PWD`).
    - If it is not inside the repo root: fail fast with a short error asking for a repo-relative path or an absolute path within the repo.
    - Otherwise set `PLAN_REL_PATH` to the repo-relative path (e.g. `tasks/impl-plan-editorctl-discover.md`).

3. Propose a **concise branch name** that clearly reflects the plan:

- Default prefix: `feature/`
- Use `bugfix/` if the plan is clearly a bugfix (keywords like "fix", "bug", "broken", "regression").
- Derive the slug from the plan title (first heading) or the filename.
- Sanitize slug:
    - lowercase
    - replace non-alphanumerics with `-`
    - collapse repeated `-`
    - trim leading/trailing `-`
    - keep it reasonably short (avoid > ~60 chars)

4. Create + switch worktree using Worktrunk:

- Run: `wt switch -c <branch> -y`

Do not block on a dirty working tree. If there are uncommitted changes, warn briefly and continue (user requested non-blocking).

`wt switch` will print the new directory path in the success line, after `@`. Example:

> ✓ Created new worktree for feature/control-rpc-commands-modal-spacing from master @ ~/dev/tekton-editor/tekton.feature-control-rpc-commands-modal-spacing

5. Determine the new worktree directory:

- Worktrees live under `~/dev/tekton-editor/` as sibling folders.
- Worktree folder naming convention: `tekton.<branch-sanitized>`

After `wt switch`, find the actual checkout dir from the command output (or by listing worktrees) and set:

- `NEW_DIR` = absolute path to the new worktree

6. Copy the plan file into the new worktree (from the original branch):

- Use the normalized `PLAN_REL_PATH` derived above.
- Write the plan into the new worktree at the same relative path:
    - `mkdir -p "$(dirname "$NEW_DIR/$PLAN_REL_PATH")"`
    - `cp "$PLAN_ABS_PATH" "$NEW_DIR/$PLAN_REL_PATH"`

7. Post-create action:

- If the user specified `cursor`: run `cursor NEW_DIR`
- If the user specified `codex`: **do not run** Codex. Instead, ALWAYS print the exact command for the user to run as a fenced code block:
    - Command (must be printed as a code block):

```
codex --yolo --cd NEW_DIR "execute PLAN_REL_PATH"
```

- Where `PLAN_REL_PATH` is the **repo-relative path** derived in step 2 (e.g. `tasks/impl-plan-editorctl-discover.md`).
- Example:
    - user input: `/worktree-from-plan @tasks/impl-plan-editorctl-discover.md codex`
    - command (must be printed as a code block):

```
codex --yolo --cd NEW_DIR "execute tasks/impl-plan-editorctl-discover.md"
```

- If not specified: ask which one to run (cursor vs codex). If codex, print the command (do not run it).

## Notes

- Prefer absolute paths in tool calls.
- Keep prompts short and decision-oriented (branch name confirmation + post-create action selection).
