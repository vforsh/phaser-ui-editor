# Implementation plan: polish `ControlRpcCommandsModal` paddings + spacing

Target: `src/renderer/components/controlRpcCommands/ControlRpcCommandsModal.tsx`

Goals (from Vlad)

- Make the layout feel **even + nice**, without changing density.
- Fix:
    - **Space under the title** (header ↔ content relationship)
    - **Gap between sidebar and right section**
    - **ScrollArea gutters / clipping** (content shouldn’t feel cramped or visually cut off)

Non-goals

- No feature/behavior changes (just layout/spacing).
- No re-architecture of the commands model.

---

## 0) Tooling + iteration loop

We’ll iterate using:

- `editorctl` modal + screenshot commands (baseline + after each tweak)
- `eikon` critique pass on each screenshot (preset `web-ui`)

### 0.1 Find running editor + open testbed project

```bash
cd /Users/vlad/dev/tekton-editor/tekton

npm run editorctl -- listEditors
```

Pick the correct instance by `appLaunchDir` matching this checkout and (if needed) open the default testbed:

```bash
npm run editorctl -- --port <wsPort> call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'
```

### 0.2 Open the modal via control-rpc

```bash
npm run editorctl -- --port <wsPort> call openModal '{"id":"controlRpcCommands","params":{"group":"misc"}}'
```

Useful alternates for coverage:

- `{"group":"debug"}` to sanity check screenshot commands section
- `{"group":"all"}` to maximize long lists / scrollbar presence

### 0.3 Screenshot capture (repeatable)

Preferred approach (more stable, only the modal) once we add a test id:

```bash
npm run editorctl -- --port <wsPort> call takeAppPartScreenshot '{"selector":"[data-testid=\\"control-rpc-commands-modal\\"]","format":"png"}'
```

### 0.4 Run `eikon`

```bash
eikon analyze /absolute/path/from/editorctl.png --preset web-ui-layout
```

Tip: `analyze` is the default command, so `eikon /absolute/path.png --preset web-ui-layout` also works. Add `--plain` for stable plain-text output.

---

## 1) Establish baseline screenshots (before any code changes)

Capture these states:

- **Default list**: `openModal` group `misc`
- **Long list**: group `all` (forces scrollbar)
- **Raw schema expanded**: expand Input + Output “Show raw schema” for any method
- **Empty results**: type a query that yields “No commands found.”

For each, take:

- One `takeAppPartScreenshot` once the `data-testid` is in place

Run `eikon` on each and extract a short punch list of spacing issues.

---

## 2) Planned code changes (small, targeted, measurable)

### 2.1 Add stable DOM selector for screenshots

Add `data-testid="control-rpc-commands-modal"` to a stable wrapper element inside `ControlRpcCommandsModal`.

Why:

- Enables deterministic `takeAppPartScreenshot` selectors.
- Makes future UI polish and regression checks easier.

### 2.2 Title spacing (header ↔ content)

Goal: the title area should feel visually connected, with consistent vertical rhythm.

Likely adjustments (pick the smallest change that fixes it):

- Reduce/standardize padding in the modal body vs header.
- Make the first content block align to the title baseline:
    - e.g. adjust the top padding of the outer `<Box p="md">`
    - or add a subtle divider / spacing token between header and body.

Constraints:

- Keep density unchanged overall (avoid “breathing room explosion”).
- Don’t change modal size unless clearly necessary.

### 2.3 Sidebar ↔ content gap

Current layout uses a `Group` with `gap={0}`, so the left nav touches the right content visually.

Fix:

- Introduce a consistent gap (`sm`/`md`) between sidebar and content, or a divider.
- Ensure gap doesn’t break the fixed sidebar width or cause horizontal clipping.

### 2.4 Scroll area gutters / clipping

Symptoms to eliminate:

- Content appears clipped at edges while scrolling.
- Scrollbars crowd content.
- Inner containers force `overflow: hidden` in a way that trims shadows/padding.

Likely fixes:

- Remove unnecessary `overflow: hidden` on intermediate wrappers (keep it only where needed).
- Ensure consistent horizontal padding inside the scroll region (left and right).
- Verify `MethodCard` max width behavior doesn’t create “double clipping” (card overflow + parent overflow).

---

## 3) Iteration protocol (tight loop)

For each code tweak (keep them small):

- `closeAllModals`
- `openModal` (same group as last screenshot)
- Capture screenshot(s)
- Run `eikon`
- Either:
    - Keep change (if it fixes one issue without regressions), or
    - Revert/adjust and re-run loop

Commands:

```bash
npm run editorctl -- --port <wsPort> call closeAllModals '{}'
npm run editorctl -- --port <wsPort> call openModal '{"id":"controlRpcCommands","params":{"group":"all"}}'
npm run editorctl -- --port <wsPort> call takeAppPartScreenshot '{"selector":"[data-testid=\\"control-rpc-commands-modal\\"]","format":"png"}'
eikon analyze /absolute/path.png --preset web-ui-layout
```

---

## 4) Final artifact (what we’ll hand to you)

When we’re satisfied, we’ll:

- Open the modal in the “final” state (recommend `group: "all"` for max coverage)
- Take **one final modal-only screenshot** via `takeAppPartScreenshot`
- **Paste the absolute PNG path** returned by `editorctl` back to you in the thread

Example command:

```bash
npm run editorctl -- --port <wsPort> call takeAppPartScreenshot '{"selector":"[data-testid=\\"control-rpc-commands-modal\\"]","format":"png"}'
```

---

## 5) Acceptance criteria (definition of done)

- **Title spacing**: no awkward “dead zone” or cramped collision under the modal title; consistent vertical rhythm with the rest of the app.
- **Sidebar gap**: clear separation between nav and content; no touching edges; no new horizontal overflow.
- **Scroll area**:
    - no clipped content/shadows that look like bugs
    - consistent left/right gutters while scrolling
    - scrollbar doesn’t visually collide with content
- `eikon` on the final screenshot set is “clean” (or only raises non-actionable nits).
