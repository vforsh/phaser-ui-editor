# Implementation plan: control-rpc-contract packaging + ESM hygiene + editorctl robustness

Goal: fix the packaging + type/runtime hygiene issues introduced by moving renderer/editorctl imports to `@tekton/control-rpc-contract`, without changing product behavior.

Constraints / decisions (from clarifications)

- **Artifact policy**: never commit build outputs; `packages/**/src` is source-only.
- **Dev workflow**: acceptable that dev requires `npm run build:packages` before running the app (no auto-prebuild required in this rollout).
- **Command read/write metadata**: add `kind: 'read' | 'write'` to each `CommandDefinition` and consume that in scheduler logic.
- **IDs**: use `nanoid` with **8 symbols** for request ids.
- **Transport errors**: use a `TransportError extends Error` class (not ad-hoc flags).
- **JSON schema utils**: introduce a minimal `JsonSchemaLike` type (no full JSON Schema typing).
- **Exports**: decide and implement what’s safest; see section **2**.

---

## 1) Stop committing build artifacts under `packages/control-rpc-contract/src/`

### 1.1 Identify the emitter (root cause)

The current diff suggests JS/DTs/maps were emitted into `src/` even though the package intends to output to `dist/`.

Check:

- `packages/control-rpc-contract/tsconfig.json` (`rootDir`, `outDir`, `declaration`, `sourceMap`)
- any scripts that run `tsc` with `--outDir` override
- any bundler step that writes into `src/`

### 1.2 Make it impossible to reintroduce

Implement two protections:

- **Build config**: ensure `tsc --project packages/control-rpc-contract/tsconfig.json` only writes to `packages/control-rpc-contract/dist/`.
- **Ignore policy**: add repo-level ignores so `packages/**/src/**/*.js`, `packages/**/src/**/*.d.ts`, `packages/**/src/**/*.map` never show up as untracked files again.

### 1.3 Clean up tracked artifacts

- Remove tracked emitted files from `packages/control-rpc-contract/src/` (and any other `packages/*/src` that got artifacts).
- Ensure `git status` becomes clean without “deleted generated files keep coming back” symptoms after a rebuild.

**Done when**

- No generated `.js/.d.ts/.map` exist under any `packages/*/src/`.
- Running `npm run build:control-rpc-contract` produces output only in `packages/control-rpc-contract/dist/`.

---

## 2) Fix `@tekton/control-rpc-contract` export surface (subpaths)

Problem: package `"exports"` currently includes only:

- `"."`
- `"./commands/*"`

But code may reasonably import:

- `@tekton/control-rpc-contract/modal-ids`
- `@tekton/control-rpc-contract/state-schemas`
- `@tekton/control-rpc-contract/shared-schemas`
- `@tekton/control-rpc-contract/settings-sections`

### 2.1 Recommended approach (balanced safety + ergonomics)

- Keep **root-only imports** as the preferred codebase style (most consumers should import from `@tekton/control-rpc-contract`).
- Add **explicit subpath exports** for the four “public non-command” modules above to prevent sharp-edge runtime failures.

Why: this avoids accidental deep-importing of internals via broad wildcards, while still being robust when a caller needs a specific module.

### 2.2 Concrete package.json changes (conceptual)

Update `packages/control-rpc-contract/package.json` `"exports"` to include:

- `"./modal-ids"`
- `"./settings-sections"`
- `"./state-schemas"`
- `"./shared-schemas"`

Each should export both `"types"` and `"default"` pointing at `dist/*`.

**Done when**

- `node --input-type=module -e "import('@tekton/control-rpc-contract/modal-ids')"` works from the workspace (after build).
- Existing `./commands/*` subpaths continue to work.

---

## 3) Make the “built dist required” workflow explicit and reliable

Constraint says “manual build is fine” for now, so the goal is to remove ambiguity and foot-guns.

### 3.1 Document the requirement

Update developer docs (likely `README.md` + `docs/features/editorctl/editorctl.md`) to state:

- When importing workspace packages via `"exports"`, you must run `npm run build:packages` before running the app or invoking `editorctl`.
- If something fails with “cannot find module …/dist/…”, run the package build.

### 3.2 Add a fast “one command” entrypoint (optional if desired later)

Not required for this rollout, but keep as a follow-up:

- Add a `dev:prep` or `start:prep` script that runs `build:packages` first.

**Done when**

- Fresh checkout instructions are correct and match reality.
- No “works on my machine” reliance on prebuilt `dist` hanging around.

---

## 4) ESM type/runtime import hygiene (avoid TDZ/cycles)

### 4.1 Rule: type-only imports must be `import type`

Audit and update:

- Renderer: `src/renderer/control-rpc/**`
- editorctl client: `packages/editorctl-client/src/**`
- contract commands: `packages/control-rpc-contract/src/commands/**`

Concrete examples to fix:

- `src/renderer/control-rpc/rpc-scheduler.ts`: `ControlMethod` should be `import type` (it’s a type).
- `packages/control-rpc-contract/src/commands/listModals.ts` and similar: `CommandDefinition` should be `import type` because it’s only used with `satisfies`.

### 4.2 Add enforcement (choose smallest hammer)

Option A (minimal): rely on reviewer discipline + targeted changes.

Option B (stronger, slightly broader): enable TS options like `verbatimModuleSyntax` in the _package tsconfigs_ (contract/editorctl-client/editorctl/json-schema-utils), not necessarily in app-wide tsconfig, to enforce correct emit.

**Done when**

- No command module imports runtime values solely for `satisfies` typing.
- `npm run typecheck` passes and emitted JS does not include unnecessary imports (spot-check a few built files in `dist/`).

---

## 5) Fix `RpcScheduler.isWriteMethod` brittleness by deriving from contract metadata

### 5.1 Extend the contract type

In `packages/control-rpc-contract/src/ControlApi.ts`:

- Extend `CommandDefinition` with:
    - `kind: 'read' | 'write'`

### 5.2 Annotate every command

In each file under `packages/control-rpc-contract/src/commands/*`:

- Add `kind: 'read' | 'write'` to the exported command definition.

Guideline:

- **read**: “does not mutate editor/project state” (queries, screenshots, list/get operations)
- **write**: “mutates editor/project state” (create/patch/delete, selections, camera changes, open/close modal, open project/prefab, etc.)

### 5.3 Consume it in scheduler

In `src/renderer/control-rpc/rpc-scheduler.ts`:

- Replace hardcoded allow/deny list with logic derived from contract (e.g. `controlContract[method].kind`).

This should make “new method defaults” explicit (you won’t forget to update a list).

**Done when**

- Adding a new command requires choosing `'read' | 'write'` and the scheduler behavior follows automatically.
- There are no ad-hoc method name lists in renderer scheduling code.

---

## 6) Replace `generateId()` with `nanoid(8)` for collision safety

In `packages/editorctl-client/src/rpc/id.ts`:

- Replace time+random with `nanoid(8)`.
- Ensure `nanoid` is a dependency of `@tekton/editorctl-client` (or hoisted, but still declared where used).

**Done when**

- Request ids are stable-format, low-collision, and don’t rely on time.

---

## 7) Make transport errors explicit: `TransportError extends Error`

In `packages/editorctl-client/src/transport/ws.ts`:

- Introduce `class TransportError extends Error { ... }`
- Use it in the `'error'` and “unexpected close/no response” paths.
- Prefer setting `cause` (when available) and using `instanceof TransportError` for handling.

Non-goal for this rollout: reworking request/response correlation; that’s separate hardening.

**Done when**

- No `@ts-expect-error` is needed for error tagging.
- Callers can reliably branch on `instanceof TransportError`.

---

## 8) Add minimal `JsonSchemaLike` typing in `@tekton/json-schema-utils`

In `packages/json-schema-utils/src/index.ts`:

- Replace `type JsonSchema = any` with a minimal structural type covering fields you actually read:
    - `$ref`, `definitions`, `type`, `properties`, `required`, `enum`, `items`, `oneOf`, `anyOf`, `allOf`, `description`
- Keep escape hatches where needed (index signatures or `unknown`) so the module remains tolerant of zod-to-json-schema output variance.

**Done when**

- The module compiles without `any` for the core schema shape.
- Obvious typos (e.g. `schema.properites`) become type errors.

---

## 9) Rollout order (recommended)

1. **Artifact root cause + cleanup** (section 1)
2. **Exports** (section 2) + quick smoke import tests
3. **Type-only import hygiene** (section 4)
4. **Command kind metadata** + scheduler refactor (section 5)
5. **`nanoid(8)` id** (section 6)
6. **TransportError** (section 7)
7. **JsonSchemaLike** (section 8)
8. Update docs (section 3) as you touch each subsystem

---

## 10) Verification checklist

- `npm run build:packages`
- `npm run typecheck`
- From Node ESM, verify imports resolve (after build):
    - `@tekton/control-rpc-contract`
    - `@tekton/control-rpc-contract/commands/listEditors`
    - `@tekton/control-rpc-contract/modal-ids`
    - `@tekton/control-rpc-contract/state-schemas`
    - `@tekton/control-rpc-contract/shared-schemas`
    - `@tekton/control-rpc-contract/settings-sections`
