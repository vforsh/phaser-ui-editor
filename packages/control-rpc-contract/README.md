# @tekton/control-rpc-contract

Shared control RPC contract for Tekton Editor.

This package defines the **source of truth** for control RPC method names, input/output Zod schemas, and derived TypeScript types. Both the editor runtime and external clients (`@tekton/editorctl-client`) import from here to stay in sync.

## What it includes

- `controlContract` map (method → metadata + Zod schemas)
- `ControlMethod`, `ControlInput`, `ControlOutput`, `ControlApi` types
- Shared schema helpers used by commands (`shared-schemas`, modal ids, settings sections, path schemas)
- The discovery method `getControlMeta`

## Usage (TypeScript)

```ts
import {
  controlContract,
  type ControlMethod,
  type ControlInput,
  type ControlOutput,
} from '@tekton/control-rpc-contract'

function call<M extends ControlMethod>(method: M, input: ControlInput<M>): Promise<ControlOutput<M>> {
  // ...
  throw new Error('not implemented')
}
```

## Notes

- The contract intentionally stays decoupled from renderer implementation details.
- Runtime discovery is provided via the `getControlMeta` control method.
