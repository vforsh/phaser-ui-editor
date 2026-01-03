### `editorctl` refactor: contract-driven commands + JSON-only I/O (implementation plan)

This document describes a concrete refactor plan for the `editorctl` CLI (`scripts/editorctl/`) to:

- **Stop re-declaring each command** in `scripts/editorctl/commands/*`.
- **Derive the CLI surface from the control contract** in `src/control-rpc/api/ControlApi.ts` (`controlContract`).
- Support **JSON only** for both input (params) and output (result/errors).

Context / architecture reference:

- `docs/features/editorctl/editor-control.md`
- `src/control-rpc/api/ControlApi.ts`

---

### Goals

- **Single source of truth** for method names, descriptions, and runtime validation: `controlContract` (Zod).
- **Zero per-method CLI boilerplate** when a new RPC method is added.
- **Script-friendly behavior**:
  - Params are a JSON object.
  - Output is JSON on stdout.
  - Errors are JSON on stderr with stable shape and exit codes.

---

### Non-goals

- No changes to the WebSocket JSON-RPC protocol itself (still JSON-RPC 2.0 over WS).
- No changes to renderer/main validation behavior (already contract-driven).
- No attempt to design a “pretty human output” mode (tables/text). This refactor explicitly removes it.

---

### Current state (what we’re changing)

`editorctl` currently:

- Registers commands by importing every `scripts/editorctl/commands/*.ts` module and calling `register()`.
- Duplicates method descriptions/flags/params parsing outside the contract.
- Has two output modes (`--json` vs “human”), with per-command branching.

The control contract already has:

- Method allowlist (keys of `controlContract`)
- Method metadata (group + description)
- Runtime schemas for `input` and `output`

---

### Target UX / CLI shape (JSON-only)

#### A) One command per method (auto-generated)

- `editorctl openProject`
- `editorctl listAssets`
- `editorctl deleteObjects`
- etc.

All of them:

- read params as JSON object (stdin-only)
- validate params with Zod input schema
- call `ctx.rpc.request(method, params)`
- validate result with Zod output schema (optional but recommended)
- print JSON result to stdout

#### B) Generic escape hatch

- `editorctl call <method>`

Same semantics, but method is positional and validated against `isControlMethod`.

#### C) Introspection (for tooling)

- `editorctl methods` → JSON list of methods with metadata
- `editorctl schema <method>` → JSON schema for input/output (JSON Schema)

---

### JSON input rules (strict and predictable)

All RPC params are JSON objects (or `{}` for empty-input methods).

Source:

- **stdin only** (if stdin is empty / TTY, params default to `{}`).

Validation rules:

- If input is present but not valid JSON → validation-style error (exit code `1`).
- If JSON is valid but does not match the Zod schema → validation-style error (exit code `1`) and include Zod issues in error data.
- If JSON is valid but is not an object → validation-style error (exit code `1`).

Guard clause style (return/throw early) should be used consistently when parsing input.

---

### JSON output rules (stdout/stderr contract)

#### Success (stdout)

- Print the method **`result` only** as JSON, pretty-printed (`JSON.stringify(value, null, 2) + '\n'`).

#### Error (stderr)

Always JSON. Suggested stable shape:

```json
{
  "error": {
    "message": "Human readable message",
    "code": "validation_error | transport_error | rpc_error | unexpected_error",
    "details": { }
  }
}
```

Exit codes should remain stable:

- `1` validation
- `2` transport (WS connect / send)
- `3` RPC (JSON-RPC error response)
- `99` unexpected

---

### Design: implementing contract-driven command registration

Create a single registrar that consumes `controlContract` and adds commands to commander:

- Command name: the method key (`openProject`, `listAssets`, …)
- Description: `definition.description`
- (optional) Command grouping: use `definition.group` to add help sections, or prefix help output.
- Action: parse JSON params → validate → call RPC → validate result → print JSON

Important: this registrar should **not** need to be updated when new methods are added.

---

### Proposed file/module changes

#### 1) Add: `scripts/editorctl/lib/json-input.ts`

Responsibilities:

- `readJsonInput(options): Promise<unknown | undefined>`
  - reads from stdin only
  - returns `undefined` if no input is present (caller defaults to `{}`)
- `parseJsonObject(value): Record<string, unknown>`
  - ensure the parsed value is a plain object (or allow arrays only if we decide to)

Error behavior:

- Throw an error tagged as validation error (`isValidationError = true`) with details when JSON parsing fails.

#### 2) Add: `scripts/editorctl/registerContractCommands.ts`

Responsibilities:

- `registerContractCommands(program: Command, ctx: Ctx): void`
- `registerIntrospectionCommands(program: Command): void` (or separate file)

Implementation outline:

- Iterate `Object.entries(controlContract)` with proper typing.
- For each `method`:
  - `program.command(method).description(def.description).action(async () => { ... })`
  - parse input:
    - `const raw = await readJsonInput(...)`
    - `const params = raw ?? {}`
    - `const parsedParams = def.input.parse(params)`
  - call RPC:
    - `const result = await ctx.rpc.request(method, parsedParams as any)`
  - (recommended) validate output:
    - `const parsedResult = def.output.parse(result)`
  - `ctx.output.printJson(parsedResult)`

Introspection commands:

- `methods`
  - output: `Array<{ method: string; group: string; description: string }>`
- `schema <method>`
  - validate `<method>` via `isControlMethod`
  - output: `{ method, inputSchema, outputSchema }`
  - schemas are derived from:
    - `controlContract[method].input`
    - `controlContract[method].output`
  - and converted to JSON Schema using `zod-to-json-schema`

Guard clauses:

- If method input schema expects `{}` and caller passed non-empty object, still validate via Zod.

#### 3) Update: `scripts/editorctl/index.ts`

Change from:

- `--json` option
- `outputMode` switching
- `registerAllCommands(program, ctx)`

To:

- remove `--json`
- keep `--port`
- register contract-driven commands:
  - `registerContractCommands(program, ctx)`
  - `registerIntrospectionCommands(program)`
- keep `handleError(...)`, but make it always JSON

#### 4) Update: `scripts/editorctl/lib/context.ts`

Change:

- Remove `outputMode`
- Always construct a JSON output facade (or simpler: a single `printJson`)

#### 5) Update: `scripts/editorctl/lib/output/index.ts`

Change:

- Remove table/text/KV output paths (or keep internally but unused).
- Ensure `printJson()` is the only public output used by commands.

Optional cleanup:

- Remove the `table` dependency usage if this file becomes JSON-only.

#### 6) Update: `scripts/editorctl/lib/errors.ts`

Change:

- Remove `isJsonMode` param; always output JSON errors.
- Extend error serialization to include Zod issues for validation errors.

Example details:

- For Zod errors, set:
  - `error.code = "validation_error"`
  - `error.details = { issues: zodError.issues }`

#### 7) Deprecate/remove: `scripts/editorctl/commands/*`

After the registrar is working and covers all methods, delete:

- `scripts/editorctl/commands/`
- `scripts/editorctl/commands/index.ts`

This is the main duplication removal.

---

### Optional improvements (nice-to-have)

#### A) JSON schema export (accepted / planned)

To make `editorctl schema <method>` output real JSON Schema (not a lossy “shape dump”), add:

- `zod-to-json-schema`

Then implement:

- `schema <method>` prints:
  - `{ method, inputSchema: <jsonschema>, outputSchema: <jsonschema> }`

Output should be stable and machine-readable; include `$schema` and `title` fields where appropriate.

#### B) Commander help grouping

Use `definition.group` from `CommandDefinition` to improve help output:

- Print group headings in `methods`
- Or register top-level subcommands: `editorctl assets <method>` etc.

I would avoid nested subcommands initially (more churn); group metadata can still be used for introspection output immediately.

---

### Step-by-step rollout (safe + reviewable)

#### Phase 0: small supporting utilities

- Add `lib/json-input.ts`
- Update `lib/errors.ts` to always output JSON
- Add dependency `zod-to-json-schema` (for `schema <method>`)
- Add unit-ish tests if we have a test framework set up for scripts (optional)

#### Phase 1: contract-driven registrar behind a feature flag

- Add `registerContractCommands.ts`
- Update `index.ts` to register **both** old commands and new commands behind an env flag:
  - e.g. `EDITORCTL_CONTRACT_COMMANDS=1`

This allows quick comparison and rollback.

#### Phase 2: switch default to contract-driven commands

- Make contract-driven registration the default.
- Keep old commands temporarily but mark as deprecated in README/docs.

#### Phase 3: delete legacy commands + remove human output

- Remove `scripts/editorctl/commands/*`
- Remove `--json` and any `outputMode` plumbing
- Remove `table` formatting dependency usage (if it becomes unused)

#### Phase 4: docs update

Update `docs/features/editorctl/editor-control.md`:

- Replace “7) Add the CLI command in `scripts/editorctl/commands/` … register it …” with:
  - “No CLI changes required; `editorctl` derives commands from `controlContract`.”
- Document JSON-only usage patterns:
  - stdin
  - examples for common commands

---

### Acceptance criteria

- Running `editorctl --help` lists one command per RPC method, without writing manual code per method.
- All commands accept params via JSON and reject non-JSON inputs.
- All successful outputs are JSON only.
- All errors are JSON only, written to stderr, and exit codes remain stable.
- Adding a new RPC method to `controlContract` makes it immediately available in `editorctl` without touching `scripts/editorctl/`.

---

### Suggested manual test plan

Assuming the editor is running with control WS enabled:

- No-param method:
  - `editorctl listEditors` (no stdin) → JSON output
- Param method via stdin:
  - `echo '{"path":"/tmp/project"}' | editorctl openProject`
- Invalid JSON:
  - `echo '{' | editorctl listHierarchy` → JSON error, exit 1
- Zod validation failure:
  - `echo '{"path":123}' | editorctl openProject` → JSON error, exit 1 with issues
- Transport failure:
  - `editorctl listHierarchy --port 1` → JSON error, exit 2

---

### Open questions (please answer before implementation starts)

Resolved decisions:

1) **Input**: **stdin-only**, default `{}` when no stdin.

2) **Output**: stdout prints **result only** (not the JSON-RPC envelope).

3) **Schema export**: **yes** — implement `editorctl schema <method>` using `zod-to-json-schema`.

