## Goal

Add **control-RPC** methods to:

- **List renderer log files** (newest first)
- **Fetch renderer log tail** (optionally “full”), including session header and “PAGE RELOADED” tail semantics

Then update `editorctl logs:list` / `logs:fetch` to **prefer RPC when `--port` is set**, while keeping the existing local filesystem escape hatches (`--dir`, `--file` as paths).

---

## Current state

- **Contract source of truth**: `packages/control-rpc-contract/src/ControlApi.ts`
    - Defines `controlContract` (method → `{ group, kind, description, input, output }`).
    - Method names are camelCase keys (e.g. `listAssetsTree`, `getControlMeta`).
- **Main WS router**: `src/main/ControlRpcServer.ts`
    - Validates requests via `validateControlRequest` (Zod input parsing from `controlContract`).
    - Special-cases `ping` in main; forwards everything else to renderer over IPC.
- **Renderer bridge + service** (dev only):
    - `src/renderer/control-rpc/renderer-rpc.ts` validates and executes handler, validates output with Zod.
    - `src/renderer/control-rpc/service/EditorControlService.ts` must satisfy `ControlApi` (full method map).
    - Example of “external-only” method: `src/renderer/control-rpc/service/handlers/ping.ts` throws because main handles it.
- **Logs today**:
    - Renderer console logs are written by main in dev: `src/main/RendererFileLogger.ts` → `process.cwd()/logs/renderer-<runId>.log`.
    - `editorctl` has **local utilities**:
        - `packages/editorctl/src/commands/logs-list.ts`
        - `packages/editorctl/src/commands/logs-fetch.ts`
        - Shared local parsing helpers live in `packages/editorctl/src/lib/logs.ts`

---

## Proposed design

### New control-RPC methods (contract)

Add two methods in `@tekton/control-rpc-contract`:

- **`listRendererLogs`** (group `debug`, kind `read`)
    - **Input**: `{}`.
    - **Output**: array of log file descriptors (no filesystem paths), e.g.
        - `fileName: string` (e.g. `renderer-2026-01-10T06-43-28.log`)
        - `runId: string` (extracted from fileName)
        - Optional extras “as helpful”: `mtimeMs?: number`, `sizeBytes?: number`
- **`fetchRendererLog`** (group `debug`, kind `read`)
    - **Input**:
        - Optional file selector: `{ fileName?: string; runId?: string }` (when absent: latest)
        - Tail options: `{ full?: boolean; maxLines?: number }`
    - **Output** (modeled after current `editorctl logs:fetch --format json`, but without paths):
        - `file: { fileName: string; runId: string }`
        - `sessionHeader: { startLine: number; endLine: number; text: string } | null`
        - `tail: { startLine: number; endLine: number; text: string; markerLine?: number }`
        - `truncated: boolean`
        - `truncation?: { originalLines: number; keptLines: number; reason: 'maxLines' }`

### Where the RPC is implemented

Implement these methods in **main process** (like `ping`) by extending `src/main/ControlRpcServer.ts`:

- Guard clause: if `app.isPackaged` → **throw** (respond as JSON-RPC error per requirement #6b).
- Resolve logs directory as `path.join(process.cwd(), 'logs')` (matches `RendererFileLogger`).
- Reuse (copy) the “session header + tail” extraction logic from `packages/editorctl/src/lib/logs.ts`:
    - Keep it in a small main-only helper module (e.g. `src/main/control-rpc/renderer-logs.ts`) to avoid bloating `ControlRpcServer.ts`.
- Validate generated results against `controlContract[method].output` before replying (mirror `renderer-rpc.ts` behavior), returning `ERR_INVALID_RPC_RESPONSE` when mismatched.

### Renderer-side contract completeness

Because `EditorControlService` must satisfy `ControlApi`, add renderer handlers that **throw** with a clear message (same pattern as `ping`):

- `src/renderer/control-rpc/service/handlers/listRendererLogs.ts`
- `src/renderer/control-rpc/service/handlers/fetchRendererLog.ts`
- Register them in `EditorControlService`’s `handlers` map.

This keeps `window.editor.*` coherent while making it obvious these methods are external-only.

### `editorctl` behavior update (prefer RPC when `--port`)

Update `packages/editorctl/src/commands/logs-list.ts` and `logs-fetch.ts`:

- **Local mode (escape hatch)**:
    - If `--dir` is provided → use current local filesystem behavior.
    - If `--file` is provided and looks like a path (absolute or contains a path separator) → local filesystem behavior.
- **RPC mode (preferred when `--port` is set)**:
    - If `--port` is provided and no explicit local override, call:
        - `client.call('listRendererLogs')` for `logs:list`
        - `client.call('fetchRendererLog', …)` for `logs:fetch`
    - For selecting a specific file in RPC mode:
        - Treat a bare `--file renderer-....log` as `fileName`
        - Optionally also accept `--file <runId>` as `runId` (guarded by a strict runId regex)

Output formatting:

- `--format json`: return a stable JSON shape. Prefer returning `fileName/runId` consistently; avoid embedding absolute paths in RPC mode.
- `text`: print `fileName` (RPC mode) or existing relative/absolute path (local mode).

---

## Touch points (file-by-file)

### Contract

- `packages/control-rpc-contract/src/commands/listRendererLogs.ts` (new)
- `packages/control-rpc-contract/src/commands/fetchRendererLog.ts` (new)
- `packages/control-rpc-contract/src/ControlApi.ts`
    - Import + add both commands into `controlContract`.

### Main process (implementation)

- `src/main/ControlRpcServer.ts`
    - Add method guards to handle `listRendererLogs` / `fetchRendererLog` locally (like `ping`).
    - Add output validation against Zod contract before responding.
- `src/main/control-rpc/renderer-logs.ts` (new helper, small)
    - List log files in `process.cwd()/logs` (match `renderer-<runId>.log`).
    - Read file + extract session header and tail with guard clauses.

### Renderer (stubs only)

- `src/renderer/control-rpc/service/handlers/listRendererLogs.ts` (new; throws)
- `src/renderer/control-rpc/service/handlers/fetchRendererLog.ts` (new; throws)
- `src/renderer/control-rpc/service/EditorControlService.ts` (register stubs)

### `editorctl`

- `packages/editorctl/src/commands/logs-list.ts` (prefer RPC with `--port`)
- `packages/editorctl/src/commands/logs-fetch.ts` (prefer RPC with `--port`)
- `docs/features/editorctl/editorctl.md`
    - Update “Local utilities” section to reflect: **RPC is used when `--port` is provided**, local filesystem utilities remain available via `--dir/--file`.
- (Optional follow-up) `docs/features/editorctl/editor-control-overview.md`
    - The note about logs being “local utilities” should be updated to match new behavior.

---

## Rollout order

1. Add contract command schemas + update `controlContract`.
2. Add renderer stub handlers + update `EditorControlService` to satisfy types.
3. Implement main-side handlers inside `ControlRpcServer` (plus helper module), including:
    - packaged-build guard (throw)
    - output Zod validation
4. Update `editorctl` commands to prefer RPC with `--port`, keep local overrides.
5. Update docs (`editorctl.md`, optionally `editor-control-overview.md`).

---

## Risks / edge cases

- **Dev-only logs**: `RendererFileLogger` is disabled when `app.isPackaged`. The RPC must fail loudly (JSON-RPC error) per requirement.
- **Ambiguous `--file`**:
    - A bare value could be a file name or a runId. Use strict matching and document precedence.
- **Rotation files**:
    - `RendererFileLogger` may create `renderer-<runId>.log.1` etc. Decide whether to ignore rotated files (consistent with current `editorctl` regex) or include them explicitly; keep behavior consistent across list+fetch.
- **Output compatibility**:
    - Remote mode should avoid leaking absolute paths; local mode historically included paths. Make JSON output stable and document differences clearly.

---

## Testing notes

- Start (dev) editor and discover port:
    - `npm run editorctl -- ls`
- RPC logs list:
    - `npm run editorctl -- --port <wsPort> logs:list`
    - `npm run editorctl -- --port <wsPort> logs:list --format json`
- RPC logs fetch:
    - `npm run editorctl -- --port <wsPort> logs:fetch`
    - `npm run editorctl -- --port <wsPort> logs:fetch --max-lines 200`
    - `npm run editorctl -- --port <wsPort> logs:fetch --file renderer-<runId>.log`
- Local override still works:
    - `npm run editorctl -- logs:list --dir /abs/path/to/logs`
    - `npm run editorctl -- logs:fetch --file /abs/path/to/logs/renderer-....log`

---

## Final checklist

Run `npm run typecheck` and `npm run lint` (use `npm run lint:fix` if needed), and fix any errors found.
