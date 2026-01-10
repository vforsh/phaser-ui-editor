# @tekton/editorctl-client

Typed Node/Bun client for Tekton Editor control RPC.

## Usage

The recommended way to set up a client in scripts is using `connect()`, which automatically discovers running editor instances and applies a sensible default selection policy:

- Prefer an editor launched from the same repo directory as the running script (nearest parent dir containing `package.json`)
- Else, try `EDITOR_CONTROL_WS_PORT` (direct port ping, bypasses registry)
- Else, pick the latest started editor among discovered instances

```ts
import { connect } from '@tekton/editorctl-client'

// Connect using the default selection policy
const { client, editor } = await connect()

console.log(`Connected to editor in ${editor.appLaunchDir}`)
await client.ping()
```

### Picking a specific instance

Use the `pick` option in `connect()` to filter which instance to use.

```ts
// Pick by project path (strict match with normalization)
const { client } = await connect({
  pick: { prefer: { projectPath: '~/dev/my-game' } }
})

// Pick by project path (substring match)
const { client } = await connect({
  pick: { prefer: { projectPathIncludes: 'my-game' } }
})

// Pick by application launch directory (strict match with normalization)
const { client } = await connect({
  pick: { prefer: { appLaunchDir: '~/dev/tekton-editor/tekton' } }
})

// Pick by application launch directory (substring match)
const { client } = await connect({
  pick: { prefer: { appLaunchDirIncludes: 'tekton.feature-branch' } }
})

// Direct port connection (bypasses registry)
const { client } = await connect({
  pick: { prefer: { port: 17870 } }
})
```

### Manual Discovery

If you need to list all running editors, use `discoverEditors()`.

```ts
import { discoverEditors, pickEditor, createClient } from '@tekton/editorctl-client'

const editors = await discoverEditors()
for (const editor of editors) {
  console.log(`${editor.instanceId} - ${editor.projectPath}`)
}

// Pick from the discovered list
const editor = await pickEditor(editors, { prefer: { projectPathIncludes: 'my-game' } })
const client = createClient(editor)
```

## Errors

The client throws several types of errors, all of which include context:

- **PickEditorError**: Thrown when `pickEditor` or `connect` fails to find a suitable editor instance. Includes `reason` (e.g., `'no-editors'`, `'no-match'`).
- **TransportError**: Connectivity issues (connection refused, premature close, or 30s timeout). The client automatically retries failed transport attempts based on `maxAttempts` (default 3).
- **RpcError**: Thrown when the editor receives the request but returns an error (e.g., invalid params).

Use the provided type guards and error utilities for robust error handling:

```ts
import {
  isRpcError,
  isTransportError,
  PickEditorError,
  getErrorLog
} from '@tekton/editorctl-client'

try {
  const { client } = await connect()
  await client.openProject({ path: '/invalid', forceReopen: false })
} catch (err) {
  if (err instanceof PickEditorError) {
    console.error(`Selection failed (${err.reason}):`, err.message)
  } else if (isTransportError(err)) {
    console.error(`Network failure on port ${err.port}:`, err.message)
  } else if (isRpcError(err)) {
    console.error(`RPC failure (${err.code}) for ${err.method}:`, err.message)
  } else {
    console.error('Unexpected failure:', getErrorLog(err))
  }
}
```

## Generated control methods

Control RPC methods are generated from `@tekton/control-rpc-contract` and exposed directly on the client instance. Prefer these when you want typed calls with rich JSDoc, while keeping the lower-level `call()` available for dynamic use cases.

```ts
await client.openProject({ path: '/Users/vlad/dev/papa-cherry-2' })
await client.ping()
```

Generated sources live under `src/__generated__` and are intentionally uncommitted. Build/typecheck runs codegen automatically.
