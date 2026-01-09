# @tekton/editorctl-client

Typed Node/Bun client for Tekton Editor control RPC.

## Usage

```ts
import { createClient, discoverEditors } from '@tekton/editorctl-client'

const [editor] = await discoverEditors()
if (!editor) {
  throw new Error('No running editors found')
}

const client = createClient({ port: editor.wsPort })

// Call generated convenience methods directly.
await client.openProject({ path: '/Users/vlad/dev/papa-cherry-2' })
await client.ping()

const meta = await client.methods()
const schema = await client.schema('openProject')
```

## Example: discover editors + pick by launch dir

```ts
import { discoverEditors } from '@tekton/editorctl-client'

async function run() {
  const editors = await discoverEditors()

  const pick = editors.find((entry) =>
    entry.appLaunchDir?.includes('tekton.editorctl-refactor-meta'),
  )

  if (!pick) {
    throw new Error('No matching editor found')
  }

  console.log(`picked port: ${pick.wsPort}`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## Example: open prefab

```ts
import { createClient } from '@tekton/editorctl-client'

async function run() {
  const client = createClient({ port: 17870 })

  await client.openProject({ path: '/Users/vlad/dev/papa-cherry-2' })

  const prefabs = await client.listAssetsOfType({ type: 'prefab' })
  const prefabId = prefabs[0]?.id
  if (!prefabId) {
    throw new Error('No prefab assets found')
  }

  // Resolves only after the prefab is fully loaded and MainScene is ready.
  await client.openPrefab({ assetId: prefabId })
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## Example: take a screenshot

```ts
import { createClient } from '@tekton/editorctl-client'

async function run() {
  const client = createClient({ port: 17870 })

  const result = await client.takeAppScreenshot({ format: 'png' })
  console.log(`saved screenshot: ${result.path}`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## Errors

The client throws two main types of errors:

- **TransportError**: Connectivity issues (connection refused, premature close). The client automatically retries failed transport attempts based on `maxAttempts` (default 3).
- **RpcError**: Thrown when the editor receives the request but returns an error (e.g., invalid params).

Use the provided type guards and error utilities for robust error handling:

```ts
import { isRpcError, isTransportError, getErrorLog } from '@tekton/editorctl-client'

try {
  await client.openProject({ path: '/invalid' })
} catch (err) {
  if (isTransportError(err)) {
    console.error('Network failure:', err.message)
  } else if (isRpcError(err)) {
    console.error(`RPC failure (${err.code}):`, err.message)
  } else {
    // getErrorLog formats unknown errors into "Name - Message"
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
