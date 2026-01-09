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

By default, `editorctl` connects to port `17870`. To target a different port:

```bash
npm run editorctl -- --port 17870 -- methods
```

### Local utilities (no control-rpc)

`editorctl` also includes a small set of **local filesystem utilities** that do **not** connect to the editor.

#### `logs:list`

List available renderer log files from the running editor’s logs directory (newest first).  
When `--port` is not provided, you must pass `--dir`.

```bash
npm run editorctl -- --port 17870 logs:list
```

```bash
npm run editorctl -- logs:list --format json
```

```bash
npm run editorctl -- logs:list --dir /abs/path/to/logs
```

#### `logs:fetch`

Fetch the latest renderer log tail (after the last `SYS : PAGE RELOADED`) and include the session header block.  
By default it uses the running editor’s logs directory from `--port`. If `--port` is not provided, pass `--dir` (or `--file`).

```bash
npm run editorctl -- --port 17870 logs:fetch
```

```bash
npm run editorctl -- logs:fetch --file logs/renderer-2026-01-09T13-44-13.log
```

```bash
npm run editorctl -- logs:fetch --full
```

```bash
npm run editorctl -- logs:fetch --format json
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
