# @tekton/editorctl-client

Typed Node/Bun client for Tekton Editor control RPC, powered by runtime discovery.

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

  const assets = await client.call('listAssets', { types: ['prefab'] })
  const stack = [...assets.assets]
  let prefabId: string | null = null

  while (stack.length) {
    const node = stack.shift()
    if (!node) continue
    if (node.type === 'prefab') {
      prefabId = node.id
      break
    }
    if (Array.isArray(node.children)) stack.push(...node.children)
  }

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

## Example: method-specific help output

```ts
import { createEditorctlClient } from '@tekton/editorctl-client'
import { buildExampleObject, derefRoot, isObjectSchema, renderObjectShape } from '@tekton/json-schema-utils'

async function run() {
  const client = createEditorctlClient({ port: 17870 })
  const { inputSchema } = await client.schema('openProject')
  const root = derefRoot(inputSchema)

  if (isObjectSchema(root)) {
    const lines = renderObjectShape(root, 2)
    console.log(lines.join('\n'))
    const example = buildExampleObject(root)
    if (example) {
      console.log('Example:', JSON.stringify(example))
    }
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## Notes

- `methods()` and `schema()` rely on the editor's `getControlMeta` discovery method.
- Transport is WebSocket-only.
