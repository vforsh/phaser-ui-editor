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

## Troubleshooting

- **Connection / selection errors**: run `editorctl target`, then `editorctl discover`, then pass `--port` if needed.
- **Discovery missing**: if you see an error about `getControlMeta`, update Tekton Editor to a newer version.
