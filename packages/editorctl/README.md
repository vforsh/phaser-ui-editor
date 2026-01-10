# @tekton/editorctl

CLI for controlling a running Tekton Editor instance via JSON-RPC. Built on [@tekton/editorctl-client](../editorctl-client).

## Quickstart

1. Start Tekton Editor.
2. See what instance `editorctl` will talk to:

```bash
editorctl target
```

3. Call a method:

```bash
editorctl call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
editorctl logs
```

Tip: wrap JSON in single quotes to avoid shell escaping issues.

## Discoverability: find methods + learn inputs

List all running editors:

```bash
editorctl discover
```

List methods:

```bash
editorctl methods --format table
```

Show “what JSON do I pass?” help for a method (check the "Example" section in output):

```bash
editorctl info openProject
```

Print full JSON Schemas (input + output) for a method:

```bash
editorctl schema openProject
```

## How CLI finds editor to target

By default, `editorctl` uses the following selection policy:

- Prefer an editor launched from the same repo/worktree as the current directory
- Else, try `EDITOR_CONTROL_WS_PORT` (direct port connection)
- Else, pick the most recently started discovered editor

### Override the target

Force a port:

```bash
editorctl --port 17870 call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

Or set an env var:

```bash
EDITOR_CONTROL_WS_PORT=17870 editorctl call ping
```

## Logs

Fetch renderer logs from the targeted editor:

```bash
editorctl logs
```

When this is useful:

- **Bug reports / “what just happened?”**: grab the recent renderer output around a UI action (open project, asset import, save, etc.).
- **Crashes / blank UI**: check for early exceptions, failed module loads, or repeated errors.
- **RPC / IPC issues**: confirm whether the renderer is calling main-process APIs and what errors come back.
- **Performance suspicion**: look for repeated warnings/errors that spam logs or expensive operations happening frequently.

What the output looks like (default):

- **Session header**: a short block describing the renderer session (metadata + environment). This helps you confirm you’re looking at the right run.
- **`---` separator**
- **Tail**: the last N lines of log output (a “tail”, not the full file).

Example (shape only; content will differ):

```text
[session] runId=2026-01-10T13-46-33
[session] appVersion=...
[session] platform=darwin arm64
---
[info] ...
[warn] ...
[error] Uncaught Error: ...
    at ...
```

Things to pay attention to:

- **Warnings vs errors**: search for `warn`, `error`, `Unhandled`, `Uncaught`, `Reject`, `Failed`, stack traces, and repeated messages (spam usually indicates a loop).
- **Session header**: if the timestamps/runId don’t match what you expected, you may be looking at a different editor instance—rerun with `--port` or confirm via `editorctl target` / `editorctl discover`.
- **Truncation notice**: if stderr prints `tail truncated: kept ...`, you may need `--full` (or increase `--max-lines`) to see the full context.

Useful flags:

```bash
editorctl logs --max-lines 2000
editorctl logs --full
editorctl --port 17870 logs
```

More control:

```bash
# Hide the session header and show only log tail
editorctl logs --no-session-header

# Pick a specific log file / run id (useful when multiple sessions exist)
editorctl logs --file renderer-2026-01-10T13-46-33.log
editorctl logs --run-id 2026-01-10T13-46-33

# Machine-readable output (includes truncation/session info)
editorctl logs --json
```

## Troubleshooting

- **Connection / selection errors**: run `editorctl target`, then `editorctl discover`, then pass `--port` if needed.
- **Discovery missing**: if you see an error about `getControlMeta`, update Tekton Editor to a newer version.
