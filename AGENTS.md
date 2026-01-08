## General rules

- **Keep files small**: Keep files under ~500 LOC so changes stay reviewable. If a file starts to sprawl, split it before adding more logic. Prefer extracting cohesive helpers/hooks/subcomponents over adding branching in-place.

- **Stable UI test IDs**: For app UI, add `data-testid` to _stable, large components_ (things tests/automation will target long-term). Use durable IDs; stable across copy/layout refactors. Don’t derive IDs from labels or DOM structure.

- **Commits**: Conventional Commits only (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`). Pick type by user-visible intent, not files touched. If there’s nuance: add a short “why” body.

- **Merge messages**: No generic/squash placeholders (esp. from `wt merge`) like `Changes to 7 files`. Replace with a real Conventional Commit summary describing the outcome, not the mechanics. Add a short body when it clarifies constraints/edge cases/follow-ups.

- **Writing style**: Direct; information-dense. Avoid filler, repetition, and long preambles (esp. in agent replies and “how-to” docs). Optimize for scanability: someone should find the rule fast and apply it correctly.

- **Adding rules**: When adding new rules/sections to `AGENTS.md`, keep them short and scannable. 3-5 sentences per bullet. Use the existing format: `##` section headers, bold-labeled bullets, and `---` separators between sections. Prefer telegraph style; add extra sentences only when they prevent misinterpretation.

- **Return early (guard clauses)**: Use guard clauses to handle error conditions and edge cases first. Return early to avoid deep nesting. Prefer multiple small guards over one large nested block.

- **Locality (order by call sequence)**: Declare functions/methods close to their callsites. Order them in call sequence (caller before callee) so readers can follow top-to-bottom. Keep helpers next to the primary method that uses them unless they’re widely reused.

- **Plans (implementation/refactor)**: When the user asks for an implementation or refactor plan, always end the plan with a short “final checklist”. It must explicitly say to run `npm run typecheck` and `npm run lint` after implementation, and to fix any errors found (use `npm run lint:fix` when appropriate). Keep this checklist to 1–2 short sentences.

- **Typechecking**: Use `npm run typecheck` for one-shot typechecking. Don’t use `typecheck-dev` for “quick checks” (watch mode).

---

## Critical Thinking

- **Fix root cause**: Fix the underlying cause, not symptoms. Trace failures to the violated invariant/contract; correct it. Add guards/fallbacks only when product-required (not to hide bugs).

- **Unclear?**: Read more code until you understand the existing pattern + constraints. Still unclear: ask concise questions with a small set of options. Don’t guess across layers (UI + RPC + data model) at once.

- **Conflicts**: Call out the conflict; state the tradeoff (1–2 sentences). Prefer the safer path when uncertainty is high (esp. persistence/editor behavior/user data). If risk is real: propose a minimal, reversible first step.

- **Unrecognized changes**: Assume intentional/another agent; keep going; focus scope. If it affects your work (types/APIs/build), stop and ask before large rewrites. When in doubt: isolate your fix; don’t depend on speculative refactors.

- **Breadcrumbs**: Leave short notes about what changed + why (esp. non-obvious decisions). Mention key files/functions so someone can follow the trail. If you rejected an approach: leave a one-line reason to prevent rework.

---

## Git Worktrees

- **Worktrees root**: Worktrees live as siblings under `~/dev/tekton-editor/` "container" directory.

- **Main checkout**: Primary working tree: `~/dev/tekton-editor/tekton` (`master` branch). Treat it as the default base for tooling/scripts unless a worktree is mentioned.

- **One folder per worktree**: Name each worktree `tekton.<branch-sanitized>`. Keep names consistent so branch ↔ folder is obvious at a glance. Example: `feature/snap-to-grid` → `tekton.feature-snap-to-grid`.

- **Worktrunk (`wt`) CLI**: Manage worktrees via Worktrunk’s `wt` CLI: `https://github.com/max-sixty/worktrunk`. Use it to create/switch worktrees without manual branch/folder wiring.

- **Worktrunk workflow docs**: See `docs/workflows/git/git-worktrees.md`. Unsure which `wt` command fits: check docs before improvising. Keep examples aligned with the real repo layout.

- **Worktrunk common commands**: `wt list` (see worktrees), `wt switch -c <branch> -y` (create + switch), `wt merge` (merge back). Always sanity-check merge commit message before shipping.

---

## Running & testing the editor

- **When**: If the feature needs runtime verification (Canvas/Hierarchy/Inspector behavior, control RPC, etc.), drive the running editor via `editorctl`. Use it when runtime behavior can differ from code review (selection, focus, IPC, rendering). Prefer validating the user’s workflow, not just the happy path.

- **Docs**: See [`docs/features/editorctl/editorctl.md`](./docs/features/editorctl/editorctl.md). Use docs to discover methods + payload shapes (don’t guess). If you add/change a method/contract: update docs so the workflow stays reliable.

- **Pre-flight**: Run `npm run build:packages` before `editorctl` (esp. fresh checkout / contract changes). Avoid “method not found” / schema mismatch from stale packages. If runtime behavior is weird: rebuild before digging deeper.

- **Discover**: Prefer meta commands (`methods`, `schema <method>`, `call <method> '<json>'`) to explore capabilities. Stay aligned with the current RPC surface area; avoid calling non-existent commands. When unsure: inspect schemas; don’t infer params.

- **CLI args**: Always pass `--` before args (e.g. `npm run editorctl -- ...`) so npm forwards flags correctly. Avoid subtle “args swallowed” issues. Keep examples consistent.

- **Targeting**: Use `--port <wsPort>` from `listEditors`. If multiple editors are running, don’t guess—choose the one matching the right project + launch dir. Wrong targeting creates “works on my machine” false positives.

- **1) Discover running editors**: Start with `npm run editorctl -- listEditors` to find running instances + ports. Treat as required first step; most follow-ups depend on correct targeting. If multiple entries: pick the one for your worktree.

- **2) If none are running**: If `listEditors` is empty, start the editor (prefer `npm run start:bg`; don’t disrupt the user). Wait for the `[control-rpc] ws://127.0.0.1:<port>` line; then run `listEditors` again. If startup is messy: check build/package issues before retrying.

- **Wait for**: In start output, look for `[control-rpc] ws://127.0.0.1:<port>` (control channel ready). Only then re-run `listEditors` to confirm port is discoverable. Avoid startup races + inconsistent results.

- **3) Pick the right instance**: If multiple instances: choose deliberately. Use `projectPath` (what’s open / should be open) and `appLaunchDir` (which checkout) to confirm. When documenting, include the chosen port for reproducibility.

- **Instance `projectPath`**: Should match the project you intend to test (default: `/Users/vlad/dev/papa-cherry-2`). If it doesn’t: open the correct project before deeper calls. Prevents debugging the wrong state.

- **Instance `appLaunchDir`**: Should match the worktree/checkout you’re working in. If it points elsewhere: you may be testing old code. Fix targeting before trusting results.

- **4) Open a project**: Most commands won’t work without an open project. Use default testbed `/Users/vlad/dev/papa-cherry-2` (has `project.json5`) unless user specifies another. Confirm via reported `projectPath`.

- **Default testbed**: Open `/Users/vlad/dev/papa-cherry-2` via `openProject` using the discovered port. Keep the path explicit for reproducibility. If it fails: double-check port + project existence.

- **Subsequent calls**: Use the discovered `wsPort` for all follow-up `call <method>` invocations. Prefer copy/paste from `listEditors` over retyping. Keep commands consistent so you can compare results across runs.

- **Tip**: Use `projectPath` from `listEditors` to confirm the project is actually open. Don’t assume the editor remembered your last project (esp. across restarts). This saves time when commands mysteriously no-op.

---

## Logging

- **Log files**: In dev, main window renderer `console.*` is captured by the main process and written under `./logs` (files live at `./logs/renderer-<runId>.log`). Use it for quick debugging when you can’t attach devtools or want a stable artifact. Treat as dev-only diagnostics, not a replacement for real error reporting.

- **Quirk**: Uses Electron `console-message` (string payload), so object logging can degrade (e.g. `label [object Object]`). Prefer serializing important structured data.

- **Log channels**: For app logging, use the channel-based logger from `src/renderer/logs/logs.ts` (import `logger`) and pick the channel that best matches the purpose via `logger.getOrCreate(<channel>)`. Channels are defined in `src/renderer/logs/LogChannel.ts`. Avoid raw `console.*` for non-trivial logging; it’s easy to lose context and harder to filter.

- **String-first logging**: Put the main information in a string so it survives into text logs reliably. If you need to log structured data, serialize it (e.g. JSON) into the message string (or include a short, string summary + a serialized payload). Don’t rely on logging raw objects as separate args for anything important.
