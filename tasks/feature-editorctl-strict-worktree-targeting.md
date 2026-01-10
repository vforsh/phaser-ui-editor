## Goal

Make `editorctl` **strictly target only editor instances launched from the same worktree** when the CLI is run in **dev mode** (tsx/TS entrypoint). If the resolved target editor is from a different `appLaunchDir`, return a **validation error** (JSON error output) instead of silently falling back.

This ensures that in a new git worktree, the worktree’s CLI can only control editor builds launched from that same worktree.

## Current state

- `Tekton Editor` main process writes discovery records with `appLaunchDir = process.cwd()` in `src/main/ControlRpcManager.ts`.
- `@tekton/editorctl-client` provides `connect()` with a _default_ selection policy:
    - Prefer same repo root (nearest parent containing `package.json`) via `prefer: { appLaunchDir: repoRoot }`
    - But if no match, it **falls back** to `EDITOR_CONTROL_WS_PORT` ping and then to “latest” discovered editor.
- `packages/editorctl/src/cli.ts`:
    - If `--port` is provided, it calls `createClient({ port })` (no directory validation).
    - Otherwise it calls `connect()` with default selection policy.
- Errors are printed as JSON by `packages/editorctl/src/lib/errors.ts` via `handleError()`, including `validation_error` for `PickEditorError` and for `createValidationError(...)`.

## Proposed design

### 1) Add “dev vs built” runtime detection (no “installed” distinction)

Add a small helper in `packages/editorctl/src/lib/runtimeMode.ts`:

- Compute `entry = process.argv[1] ?? ''`.
- **Dev mode** if `entry` ends with `.ts` (repo root uses `tsx ... packages/editorctl/src/cli.ts`).
- **Built mode** otherwise (bin points at `./dist/cli.js`).

Return a simple union: `'dev' | 'built'`.

Guard clauses:

- If `entry` is empty/non-string, treat as `'built'` (conservative).

### 2) Enforce strict same-worktree targeting in dev mode (including `--port`)

Policy (per requirements):

- Only enforce when runtimeMode is `'dev'`.
- Enforce for commands that actually resolve a target / connect (`target`, `call`, `methods`, `schema`, `logs`, etc.).
- No need to change `discover` behavior (it can list everything).

Implementation approach (keep changes local to `editorctl` CLI package):

- In `packages/editorctl/src/cli.ts`, centralize the “getClient + resolve target editor record” logic into a helper:
    - Resolve `repoRoot` using the same algorithm as `@tekton/editorctl-client` default pick mode (nearest parent containing `package.json`), but implemented locally in `editorctl` so we can use it both for `--port` and for registry-based picking.
    - If runtimeMode is `'built'`: keep current behavior (no strict check; current `connect()` default policy remains).
    - If runtimeMode is `'dev'`:
        - If `--port` is provided:
            - Use `connect({ pick: { prefer: { port }, fallback: 'error' } })` to ping and return the `DiscoveredEditor` record (not just a raw client).
            - Validate `editor.appLaunchDir === repoRoot` (normalize/realpath both sides if needed).
            - If mismatch: throw `createValidationError(...)` with details containing:
                - `expectedAppLaunchDir`, `actualAppLaunchDir`, `wsPort`, `instanceId`
        - If `--port` is not provided:
            - Call `connect({ pick: { prefer: { appLaunchDir: repoRoot }, fallback: 'error' } })`.
            - If it fails (PickEditorError `no-match` / `no-editors`): allow it to bubble to `handleError` (validation_error), with a message explaining “no editor for this worktree”.

Notes:

- This avoids changing `@tekton/editorctl-client` semantics for other consumers.
- It ensures `--port` cannot bypass the worktree restriction in dev mode.

### 3) Error message and details shape

Use error UX option **(b)**:

- Message (string-first, actionable):
    - `Target editor is from a different worktree: expected launchDir="<expected>", got launchDir="<actual>" (wsPort=<port>, instanceId=<id>).`
- Details (JSON):
    - `{ expectedAppLaunchDir, actualAppLaunchDir, wsPort, instanceId, runtimeMode }`

Exit code remains `1` (`ExitCode.Validation`) via existing error pipeline.

## Touch points (file-by-file)

- `packages/editorctl/src/lib/runtimeMode.ts` (new)
    - Add `getEditorctlRuntimeMode(): 'dev' | 'built'`.
- `packages/editorctl/src/lib/repoRoot.ts` (new, or colocate in `cli.ts` if preferred)
    - Implement `findNearestRepoRoot(startDir: string): Promise<string>` mirroring the logic from `@tekton/editorctl-client/src/connect.ts`.
- `packages/editorctl/src/cli.ts`
    - Replace current `getClient` implementation with one that:
        - Detects runtime mode
        - Computes repo root (expected launch dir)
        - Uses `connect(...)` in both cases (including `--port`) so we always have the `editor` record to validate
        - Throws `createValidationError` on mismatch (dev only)
- (Optional) `packages/editorctl/src/lib/errors.ts`
    - No functional change required; only if we want to add a dedicated error code later. For now, reuse `validation_error`.

## Rollout order

1. Add `runtimeMode` helper with unit-like sanity checks via quick local runs.
2. Add repo-root resolver helper (copy exact behavior from `editorctl-client`).
3. Update `cli.ts`:
    - Route both `--port` and default through `connect(...)`
    - Add dev-only strict check
4. Update docs (optional but recommended): `docs/features/editorctl/editorctl.md`
    - Add a short note: in repo `npm run editorctl` is strict to the current checkout; use built `editorctl` if you want “global” targeting behavior.

## Risks / edge cases

- **CWD sensitivity**: If someone runs `npm run editorctl` from a subdirectory, `repoRoot` must still resolve correctly (nearest parent `package.json`). Ensure we use `process.cwd()` and walk upward, matching existing behavior.
- **Symlinks / realpath**: Worktrees might include symlinks. Normalize (realpath) both expected and actual before comparing.
- **No editors running**: Should produce a validation error with a clear message (PickEditorError `no-editors`).
- **Multiple editors from same worktree**: `pickEditor(..., fallback:'error')` with prefer `appLaunchDir` can still yield multiple candidates; `pickEditor` then picks “latest” among candidates, which is fine.

## Testing notes

- Prefer manual verification first (fast feedback).
- Then run `npm run typecheck` and `npm run lint`.

## Editorctl verification

### Setup

In worktree A:

```bash
npm run build:packages
npm run start
```

In worktree B (separate checkout), also start the editor so it registers itself:

```bash
npm run build:packages
npm run start
```

### Verify `discover` still lists all editors

```bash
npm run editorctl -- discover --json
```

Confirm it includes multiple entries with different `launchDir`.

### Verify strict targeting in dev mode (worktree mismatch → error)

From worktree A:

```bash
npm run editorctl -- target --json
```

- If the latest editor is from worktree B, `target` should now **fail** with `validation_error` and details showing expected vs actual `launchDir`.

### Verify `--port` cannot bypass (dev mode)

1. Obtain the “wrong” port from `discover --json`.
2. From worktree A, run:

```bash
npm run editorctl -- --port <wrongPort> target
```

Expect the same **validation_error** mismatch response.

### Verify correct targeting works

From worktree A, with the editor launched from worktree A running:

```bash
npm run editorctl -- target
npm run editorctl -- call getProjectInfo '{}'
```

Both should succeed.

## Final checklist

Run `npm run typecheck` and `npm run lint` (use `npm run lint:fix` when appropriate), and fix any errors found.
