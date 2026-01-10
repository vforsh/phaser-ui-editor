## `editorctl` (CLI)

`editorctl` is the repo’s **command-line client** for controlling a running Tekton Editor instance via **JSON-RPC 2.0 over WebSocket**.

The implementation lives in `packages/editorctl/`:

- It connects to the editor’s WebSocket control server at `ws://127.0.0.1:<port>`.
- It discovers its RPC surface from the running editor via `getControlMeta`.
- It is **machine-friendly**: inputs/outputs are JSON (useful for scripting and CI).

If you’re looking for the architecture and how the editor routes requests internally, see [`editor-control-overview.md`](./editor-control-overview.md).

### How to run it (from this repo)

From the repo root:

```bash
npm run build:packages
```

```bash
npm run editorctl -- --help
```

If you hit a "Cannot find module .../dist/..." error, re-run `npm run build:packages`.

When `--port` is provided, `editorctl` connects to that port. Without `--port`, it uses the auto-connect policy (same repo → `EDITOR_CONTROL_WS_PORT` → latest discovered). To target a specific port:

```bash
npm run editorctl -- --port 17870 -- methods
```

### Meta commands (introspection + generic invocation)

`editorctl` exposes **meta-only** commands. Use these to discover and call methods safely.

#### `discover` / `ls`

List running editor instances. Includes `logsDir` derived from `appLaunchDir`.

```bash
npm run editorctl -- ls
```

```bash
npm run editorctl -- ls --json
```

#### `methods`

List available control RPC methods and their metadata.

```bash
npm run editorctl -- methods
```

#### `target` / `whoami`

Show the editor instance that would be targeted. Respects `--port` when provided.

```bash
npm run editorctl -- target
```

```bash
npm run editorctl -- target --json
```

#### `schema <method>`

Print **JSON Schema** for a control RPC method’s input/output.

```bash
npm run editorctl -- schema openProject
```

#### `call <method>`

Call any control RPC method **by name**, passing JSON params as a **positional argument**.

- Pass a JSON object string as params, or omit it for `{}` (methods with no params).

```bash
npm run editorctl -- call getProjectInfo
```

```bash
npm run editorctl -- call getProjectInfo '{}'
```

```bash
npm run editorctl -- call openProject '{"path":"/abs/path/to/project"}'
```
