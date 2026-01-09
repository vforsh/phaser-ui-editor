# @tekton/editorctl-client

Typed Node/Bun client for Tekton Editor control RPC.

## Usage

```ts
import { createEditorctlClient, discoverEditors } from '@tekton/editorctl-client'

const [editor] = await discoverEditors()
if (!editor) {
  throw new Error('No running editors found')
}

const client = createEditorctlClient({ port: editor.wsPort })

const meta = await client.methods()
const schema = await client.schema('openProject')
```

## One-shot call (no client)

Use `withEditorPort()` or `withEditor()` when you want to perform a single RPC request without creating a long-lived client object.

```ts
import { withEditor, withEditorPort, discoverEditors } from '@tekton/editorctl-client'

// Option A: Use a discovered editor instance.
const [editor] = await discoverEditors()
if (editor) {
  await withEditor(editor).call('openProject', { path: '/Users/vlad/dev/papa-cherry-2' })
}

// Option B: Use a known port directly.
await withEditorPort(17870).call('ping', {})

// Optional: override the default 30s per-request timeout.
await withEditorPort(17870, { timeoutMs: 5_000 }).call('ping', {})
```

## Example: open project + inspect methods

```ts
import { createEditorctlClient, discoverEditors } from '@tekton/editorctl-client'

async function run() {
  // Discover running editors and pick one.
  const editors = await discoverEditors()
  const editor = editors[0]
  if (!editor) {
    throw new Error('No running editors found')
  }

  const client = createEditorctlClient({ port: editor.wsPort })

  // Open a project (adjust to your path).
  await client.call('openProject', { path: '/Users/vlad/dev/papa-cherry-2' })

  // Discover RPC surface at runtime.
  const meta = await client.methods()
  const methodsByGroup = new Map<string, string[]>()
  for (const entry of meta.methods) {
    const list = methodsByGroup.get(entry.group) ?? []
    list.push(entry.method)
    methodsByGroup.set(entry.group, list)
  }

  // Print a quick grouped overview.
  for (const [group, methods] of methodsByGroup) {
    console.log(`${group}: ${methods.join(', ')}`)
  }

  // Inspect a schema to build input dynamically.
  const { inputSchema } = await client.schema('openProject')
  console.log('openProject input schema:', inputSchema)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
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
import { createEditorctlClient } from '@tekton/editorctl-client'

async function run() {
  const client = createEditorctlClient({ port: 17870 })

  await client.call('openProject', { path: '/Users/vlad/dev/papa-cherry-2' })

  const assets = await client.call('listAssetsOfType', { type: 'prefab' })
  const prefabId = assets[0]?.id

  if (!prefabId) {
    throw new Error('No prefab assets found')
  }

  // Resolves only after the prefab is fully loaded and MainScene is ready.
  await client.call('openPrefab', { assetId: prefabId })
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## Example: take a screenshot

```ts
import { createEditorctlClient } from '@tekton/editorctl-client'

async function run() {
  const client = createEditorctlClient({ port: 17870 })

  const result = await client.call('takeAppScreenshot', { format: 'png' })
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
  await client.call('openProject', { path: '/invalid' })
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
