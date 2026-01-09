# UI polish reviews (`eikon` CLI)

Use `eikon` for quick visual-polish critique of Tekton UI screenshots (inconsistencies, misalignments, spacing/typography). Treat the output as a checklist for small, high-leverage fixes.

## Prerequisites: get an `editorctl` port

```bash
# List running editor instances and their control-rpc ports
npm run editorctl -- ls
```

Pick the `wsPort` for the instance you want to control, then use it as `--port <wsPort>` in commands below.

## Screenshot output

`editorctl` screenshot commands like `takeAppScreenshot` / `takeAppPartScreenshot` save to `<projectDir>/screenshots` and return an absolute file path. Pass that path directly to `eikon` (no hunting). Prefer the smallest screenshot that still demonstrates the issue.

## Modal management (`editorctl`)

These are **global** renderer modals (only one can be open at a time).

```bash
# List modals + open/closed status
npm run editorctl -- --port <wsPort> call listModals '{}'

# Open Settings modal (optional params)
npm run editorctl -- --port <wsPort> call openModal '{"id":"settings","params":{"sectionId":"general"}}'

# Open Control RPC Commands modal (optional params)
npm run editorctl -- --port <wsPort> call openModal '{"id":"controlRpcCommands","params":{"group":"all"}}'

# Close a specific modal by id
npm run editorctl -- --port <wsPort> call closeModal '{"id":"settings"}'

# Close any open modal
npm run editorctl -- --port <wsPort> call closeAllModals '{}'
```

## How to run

1. Take a screenshot via `editorctl`.
2. Run `eikon` on the returned path with a preset like `web-ui` / `web-ui-layout`.
3. If you need targeted feedback, pass a short focus note (e.g. “Focus on spacing + typography”).

Example:

```bash
# Take a screenshot (path printed in JSON output)
npm run editorctl -- --port <wsPort> call takeAppScreenshot '{"format":"png"}'

# Take a screenshot of a specific UI part (first matching element by CSS selector)
# Tip: for modals/panels, prefer a stable `data-testid` selector when available.
npm run editorctl -- --port <wsPort> call takeAppPartScreenshot '{"selector":"[data-testid=\\"control-rpc-commands-modal\\"]","format":"png"}'

# Run eikon on the returned path
eikon /absolute/path/from/json.png --preset web-ui
eikon /absolute/path/from/json.png --preset web-ui-layout
eikon /absolute/path/from/json.png --preset web-ui "Focus on spacing + typography"
```
