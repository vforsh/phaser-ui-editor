## Verification flow (features + bugfixes)

This doc describes the **default verification protocol** after implementing a feature or fixing a bug.

The flow is based on:

- **`editorctl` CLI** (external control of the running editor) — see [`docs/features/editorctl/editor-control-overview.md`](../features/editorctl/editor-control-overview.md)
- **Temporary `info` logs** (string-first) and reading renderer logs from the repo `./logs` directory — see `AGENTS.md` “Logging”

---

## Preconditions (dev)

- **Build packages**: run `npm run build:packages` (especially after contract/control changes)
- **Have a reproducible target**: pick a project and a prefab that reliably demonstrates the behavior (feature or bug)

---

## Step 1: Ensure a running editor instance (discover a `wsPort`)

Use `editorctl` discovery first. Do not guess ports.

```bash
npm run editorctl -- listEditors
```

- **If `listEditors` returns an instance**: pick the one matching the checkout/worktree you’re working on (`appLaunchDir`) and the correct open project (`projectPath`).
- **If `listEditors` is empty**: start the editor via the background start script, wait for the `[control-rpc] ws://127.0.0.1:<port>` line, then re-run `listEditors`:

```bash
npm run start:bg
```

```bash
npm run editorctl -- listEditors
```

Once you have the port, use it consistently:

```bash
npm run editorctl -- --port <wsPort> methods
```

---

## Step 2: Open the project you will use for verification

Open the project directory that contains `project.json5`.

```bash
npm run editorctl -- --port <wsPort> call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

Then confirm the editor state (optional but useful when debugging “no-op” behavior):

```bash
npm run editorctl -- --port <wsPort> call getControlMeta '{}'
```

---

## Step 3: Open the prefab / scene that reproduces the behavior

Pick a prefab that is a reliable reproduction/verification target.

- **Tip**: use `listAssets` to find prefabs/folders and confirm paths are project-relative.

Example:

```bash
npm run editorctl -- --port <wsPort> call listAssets '{"types":["prefab"]}'
```

Then open the chosen prefab (method name/params are contract-driven; use `schema` when unsure):

```bash
npm run editorctl -- --port <wsPort> schema openPrefab
```

```bash
npm run editorctl -- --port <wsPort> call openPrefab '{"path":"<project-relative-prefab-path>"}'
```

---

## Step 4: Perform the action(s) that verify the change

Drive the editor via `editorctl` with **minimal, deterministic** commands:

- **Feature verification**: perform the new workflow (e.g. create object, duplicate, rename, change component, etc.)
- **Bugfix verification**: reproduce the original failure sequence and confirm it no longer happens

When you don’t remember the exact method name/shape:

```bash
npm run editorctl -- --port <wsPort> methods
npm run editorctl -- --port <wsPort> schema <methodName>
```

---

## Step 5: Add temporary `info` logs to validate internal state transitions

When behavior can’t be confidently validated via UI alone (selection, focus, IPC ordering, renderer state, etc.), add **temporary logs**:

- **Use the channel-based logger**: import `logger` from `src/renderer/logs/logs.ts`
- **Pick a relevant channel**: defined in `src/renderer/logs/LogChannel.ts`
- **Log string-first**: keep the key information in the string so it survives into text logs reliably
- **Level**: use `info` for these temporary breadcrumbs (remove them before finishing)

Re-run the same verification commands to generate the logs you need.

---

## Step 6: Read and analyze logs from `./logs`

Renderer `console.*` output is captured and written under the repo’s `./logs` directory:

- `./logs/renderer-<runId>.log`

Workflow:

- Identify the newest `renderer-*.log` updated during your verification run
- Search for your channel/messages and confirm the expected ordering/state
- Use logs to answer: **did the internal invariant/contract hold?** If not, tighten the reproduction and add more _targeted_ info logs.

---

## Step 7: Iterate until logs confirm the expected result

Repeat:

- Reproduce via `editorctl` (same sequence, minimal inputs)
- Observe logs
- Narrow the search area (smaller reproduction, fewer moving parts)
- Fix the root cause (don’t just mask symptoms)

Stop iterating only when:

- The external behavior is correct, and
- Logs confirm the expected internal path/state (where applicable)

---

## Step 8: Cleanup + final checks (definition of done)

- **Remove all temporary debug/verification logs** you added for investigation
- Run **typecheck**:

```bash
npm run typecheck
```

- Run **lint** (and fix if needed):

```bash
npm run lint
npm run lint:fix
```

Then report outcome:

- **Feature**: verified via `editorctl` reproduction + logs; final checks passed
- **Bugfix**: original repro no longer reproduces; final checks passed
