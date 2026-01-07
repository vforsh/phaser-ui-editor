# @tekton/editorctl

Meta-only CLI for controlling a running Tekton Editor instance via JSON-RPC.

## Quickstart

1. Start the editor in dev mode.
2. Discover the control RPC port (default: `17870`).
3. Call methods via `editorctl`.

```bash
editorctl --port 17870 call listEditors '{}'
```

## Common workflow

List editors and open a project:

```bash
editorctl --port 17870 call listEditors '{}'
editorctl --port 17870 call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

Inspect methods and schemas:

```bash
editorctl --port 17870 methods
editorctl --port 17870 schema openProject
editorctl --port 17870 help openProject
```

## Troubleshooting

- **Connection errors**: confirm the editor is running and the port is correct.
- **Discovery missing**: if you see an error about `getControlMeta`, update Tekton Editor to a newer version.
