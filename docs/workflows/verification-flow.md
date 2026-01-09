## Verification flow (features + bugfixes)

Default verification protocol after implementing a feature or fixing a bug.

Tools:

- **`editorctl` CLI** — see [`docs/features/editorctl/editor-control-overview.md`](../features/editorctl/editor-control-overview.md)
- **Renderer logs** under `./logs` (plus temporary `info` breadcrumbs when needed) — see `AGENTS.md` “Logging”

---

## Preconditions (dev)

- **Build packages (when needed)**: run `npm run build:packages` (especially after contract/control changes)
- **Pick a deterministic repro target**: a project + prefab that reliably demonstrates the behavior

---

## Checklist (copy/paste friendly)

- **Discover a running editor (`wsPort`)** (don’t guess ports):

```bash
npm run editorctl -- ls
```

- **If discovery is empty**: start the editor, wait for `[control-rpc] ws://127.0.0.1:<port>`, then re-run discovery:

```bash
npm run start:bg
npm run editorctl -- ls
```

- **Pick the right instance**: match your checkout (`appLaunchDir`) and intended project (`projectPath`).
- **Use the chosen port consistently**:

```bash
npm run editorctl -- --port <wsPort> methods
```

- **Open the project** (must contain `project.json5`):

```bash
npm run editorctl -- --port <wsPort> call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

- **If commands “no-op”**: confirm control meta (optional but high-signal):

```bash
npm run editorctl -- --port <wsPort> call getControlMeta '{}'
```

- **Find and open the repro prefab** (paths are project-relative):

```bash
npm run editorctl -- --port <wsPort> call listAssetsTree '{"types":["prefab"]}'
```

```bash
npm run editorctl -- --port <wsPort> schema openPrefab
npm run editorctl -- --port <wsPort> call openPrefab '{"path":"<project-relative-prefab-path>"}'
```

- **Execute the verification sequence** via `editorctl` with minimal, deterministic commands:
    - **Feature**: perform the new workflow
    - **Bugfix**: reproduce the original failure sequence; confirm it no longer reproduces

- **If you don’t remember method names/shapes**:

```bash
npm run editorctl -- --port <wsPort> methods
npm run editorctl -- --port <wsPort> schema <methodName>
```

---

## Add temporary logs (required for verification)

This document is for AI agents: **verification must be log-driven**.

Add minimal, targeted `info` breadcrumbs to prove internal state transitions (selection, focus, IPC ordering, renderer state):

- **Use the channel-based logger**: import `logger` from `src/renderer/logs/logs.ts`
- **Pick a relevant channel**: defined in `src/renderer/logs/LogChannel.ts`
- **Log string-first** (survives into text logs reliably; serialize payloads you care about)
- **Remove these logs before finishing**

Then re-run the same `editorctl` reproduction sequence and verify the outcome by inspecting the newest `./logs/renderer-*.log`.

---

## Read logs (`./logs`) and iterate

Renderer `console.*` output is captured and written under:

- `./logs/renderer-<runId>.log`

- **Check**: the newest `renderer-*.log` updated during your run contains your messages in the expected order/state.
- **Key question**: did the internal invariant/contract hold? If not, tighten the repro and add more targeted logs.
- **Stop iterating only when**:
    - The external behavior is correct, and
    - Logs confirm the expected internal path/state (where applicable)

---

## Definition of done

- **Remove all temporary debug/verification logs**
- Run **typecheck**:

```bash
npm run typecheck
```

- Run **lint** (and fix if needed):

```bash
npm run lint
npm run lint:fix
```

- **Report outcome**:
    - **Feature**: verified via `editorctl` repro + logs; final checks passed
    - **Bugfix**: original repro no longer reproduces; final checks passed
