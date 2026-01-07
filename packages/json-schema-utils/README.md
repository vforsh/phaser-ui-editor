# @tekton/json-schema-utils

Lightweight helpers for rendering and inspecting JSON Schema output (primarily from `zod-to-json-schema`).

## What it includes

- `derefRoot` to resolve `#/definitions/*`
- `isObjectSchema` guard
- `renderObjectShape` for CLI help output
- `buildExampleObject` for simple JSON examples

## Usage

```ts
import { derefRoot, isObjectSchema, renderObjectShape } from '@tekton/json-schema-utils'

const root = derefRoot(schema)
if (isObjectSchema(root)) {
  const lines = renderObjectShape(root, 2)
  console.log(lines.join('\n'))
}
```

## Notes

- Intentionally loose typings: it reads a small subset of JSON Schema fields.
- Designed for CLI/help output rather than strict validation.
