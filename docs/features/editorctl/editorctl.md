## `editorctl` (CLI)

`editorctl` is the repo’s **command-line client** for controlling a running Tekton Editor instance via **JSON-RPC 2.0 over WebSocket**.

The implementation lives in `scripts/editorctl/`:

- It connects to the editor’s WebSocket control server at `ws://127.0.0.1:<port>`.
- It derives its RPC surface from the shared control contract (`src/control-rpc/api/ControlApi.ts`).
- It is **machine-friendly**: inputs/outputs are JSON (useful for scripting and CI).

If you’re looking for the architecture and how the editor routes requests internally, see [`editor-control-overview.md`](./editor-control-overview.md).

### How to run it (from this repo)

From the repo root:

```bash
npm run editorctl -- --help
```

By default, `editorctl` connects to port `17870`. To target a different port:

```bash
npm run editorctl -- --port 17870 -- methods
```

### Meta commands (introspection + generic invocation)

This doc intentionally does **not** list the per-method commands (they are derived from the contract). Instead, use these meta commands to discover and call methods safely.

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

