# @tekton/editorctl

Command-line interface for controlling a running Tekton Editor instance via JSON-RPC 2.0 over WebSocket.

## Overview

`editorctl` is a meta-only CLI that provides introspection and generic invocation of control RPC methods exposed by the Tekton Editor. It connects to the editor's WebSocket control server and uses runtime discovery to enumerate available methods, schemas, and help information.

**Key features:**

- **Auto-discovery**: List and target running editor instances automatically
- **Runtime introspection**: Query available methods, schemas, and help without hardcoded commands
- **Generic invocation**: Call any control RPC method with JSON parameters
- **Dev mode targeting**: Strictly enforces worktree isolation when running from repo
- **Machine-friendly**: JSON input/output for scripting and CI integration

Based on [@tekton/editorctl-client](../editorctl-client) and [@tekton/control-rpc-contract](../control-rpc-contract).

## Installation & Setup

### From this repository

Build the packages first:

```bash
npm run build:packages
```

Then run via npm script:

```bash
npm run editorctl -- --help
```

Note: If you see "Cannot find module .../dist/..." errors, re-run `npm run build:packages`.

### Global installation (future)

When published, install globally:

```bash
npm install -g @tekton/editorctl
editorctl --help
```

## Core Concepts

### Runtime modes

`editorctl` operates in two modes:

- **Dev mode**: Running from repo via `tsx` (`.ts` entrypoint)
  - Strictly enforces worktree targeting
  - Prevents accidental control of editor instances from different worktrees
  - Cannot bypass with `--port` flag
- **Built mode**: Running from installed/built version (`dist/cli.js`)
  - Uses default connection policy (prefers same repo, falls back gracefully)
  - Flexible targeting across worktrees

### Worktree targeting (dev mode)

In dev mode, `editorctl` enforces strict worktree isolation:

- Automatically resolves the current repo root (nearest parent `package.json`)
- Only targets editors launched from the same worktree (`appLaunchDir` match)
- Returns validation error if target editor is from a different worktree
- Applies to all commands that connect to an editor

**Example error (dev mode, wrong worktree):**

```json
{
  "error": "validation_error",
  "message": "Target editor is from a different worktree: expected launchDir=\"/path/to/worktree-a\", got launchDir=\"/path/to/worktree-b\" (wsPort=17870, instanceId=abc123).",
  "details": {
    "expectedAppLaunchDir": "/path/to/worktree-a",
    "actualAppLaunchDir": "/path/to/worktree-b",
    "wsPort": 17870,
    "instanceId": "abc123",
    "runtimeMode": "dev"
  }
}
```

### Connection policy

Without `--port` flag:

1. **Dev mode**: Strict match on `appLaunchDir` (repo root), fails if no match
2. **Built mode**: Prefers `appLaunchDir`, falls back to `EDITOR_CONTROL_WS_PORT`, then latest discovered

With `--port` flag:

1. Connects to specified port
2. **Dev mode**: Validates `appLaunchDir` match, fails if mismatch
3. **Built mode**: Connects without validation

## Commands

All commands support the global `--port <number>` option to target a specific editor instance.

### `discover` / `ls` / `editors`

List all running Tekton Editor instances.

**Options:**

- `--json` - Output JSON format
- `--no-ping` - Skip ping verification
- `--timeout <ms>` - Ping timeout in milliseconds (default: 400)

**Examples:**

```bash
# Human-readable list
npm run editorctl -- discover

# JSON output for scripting
npm run editorctl -- ls --json

# Skip ping, list all discovery records
npm run editorctl -- discover --no-ping
```

**Output includes:**

- `wsPort` - WebSocket port
- `instanceId` - Unique instance identifier
- `appLaunchDir` - Directory where editor was launched
- `logsDir` - Derived logs directory path
- `pid` - Process ID (if available)

### `target` / `ping`

Show the editor instance that would be targeted by the current command.

**Options:**

- `--json` - Output JSON format

**Examples:**

```bash
# Show target editor
npm run editorctl -- target

# Show target with JSON output
npm run editorctl -- target --json

# Show target for specific port
npm run editorctl -- --port 17870 target
```

Use this to verify which editor instance will receive your commands.

### `methods`

List all available control RPC methods with metadata.

**Options:**

- `--json` - Output JSON format
- `--detail <level>` - Detail level: `minimal` (default), `full`

**Examples:**

```bash
# Minimal output (method names and descriptions)
npm run editorctl -- methods

# Full output (includes input/output schema info)
npm run editorctl -- methods --detail full

# JSON output
npm run editorctl -- methods --json
```

**Output includes:**

- Method name
- Description
- Group (e.g., project, scene, misc, debug)
- Input/output schema information (with `--detail full`)

### `schema <method>`

Print JSON Schema for a control RPC method's input and output.

**Examples:**

```bash
# View schema for openProject
npm run editorctl -- schema openProject

# View schema for listAssetsTree
npm run editorctl -- schema listAssetsTree
```

**Output:**

```json
{
  "method": "openProject",
  "input": { /* JSON Schema */ },
  "output": { /* JSON Schema */ }
}
```

### `help <method>`

Print human-readable help for a control RPC method, including JSON input examples.

**Examples:**

```bash
# Get help for openProject
npm run editorctl -- help openProject

# Get help for setCamera
npm run editorctl -- help setCamera
```

### `call <method> [params]`

Call any control RPC method by name with JSON parameters.

**Arguments:**

- `<method>` - Control RPC method name
- `[params]` - Optional JSON object string (defaults to `{}`)

**Examples:**

```bash
# Call method with no parameters
npm run editorctl -- call getProjectInfo

# Call with empty object (explicit)
npm run editorctl -- call getProjectInfo '{}'

# Call with parameters
npm run editorctl -- call openProject '{"path":"/absolute/path/to/project"}'

# Call with complex parameters
npm run editorctl -- call listAssetsTree '{"types":["prefab","folder"]}'

# Call modal commands
npm run editorctl -- call openModal '{"id":"settings","params":{"sectionId":"general"}}'

# Call camera commands
npm run editorctl -- call setCamera '{"zoom":1.5,"scrollX":100,"scrollY":50}'
```

**Returns:**

- JSON result on success
- JSON error on failure (with error code, message, and details)

### `logs`

Print renderer log output from the target editor.

**Options:**

- `--json` - Output JSON format
- `--file <fileName>` - Specific log file name
- `--run-id <runId>` - Specific run ID
- `--full` - Return full log content (no truncation)
- `--max-lines <n>` - Limit tail to last N lines
- `--session-header` - Include session header block (default: true)
- `--no-session-header` - Exclude session header block

**Examples:**

```bash
# View recent logs (tail with session header)
npm run editorctl -- logs

# View full log content
npm run editorctl -- logs --full

# Limit to last 50 lines
npm run editorctl -- logs --max-lines 50

# View without session header
npm run editorctl -- logs --no-session-header

# JSON output
npm run editorctl -- logs --json
```

**Output:**

- Session header (if enabled and not `--full`)
- Separator line `---`
- Log tail (recent lines)
- Truncation warning on stderr if applicable

## Common Workflows

### Quick start: discover and connect

```bash
# 1. Start the editor (separate terminal)
npm run start

# 2. List running editors
npm run editorctl -- discover

# 3. Connect to default editor and get project info
npm run editorctl -- call getProjectInfo
```

### Open a project and load a scene

```bash
# Open project
npm run editorctl -- call openProject '{"path":"/absolute/path/to/project"}'

# List available scenes
npm run editorctl -- call listScenes

# Load a specific scene
npm run editorctl -- call loadScene '{"id":"<scene-id>"}'
```

### Inspect and call methods

```bash
# 1. List all available methods
npm run editorctl -- methods

# 2. Get detailed help for a method
npm run editorctl -- help openPrefab

# 3. View JSON schema
npm run editorctl -- schema openPrefab

# 4. Call the method
npm run editorctl -- call openPrefab '{"path":"prefabs/MyPrefab.json"}'
```

### Script with JSON output

```bash
#!/bin/bash

# Get target editor info
EDITOR_INFO=$(npm run editorctl -- target --json 2>/dev/null)
echo "Target editor: $EDITOR_INFO"

# Get project info
PROJECT_INFO=$(npm run editorctl -- call getProjectInfo 2>/dev/null)
echo "Project: $PROJECT_INFO"

# List all prefabs
PREFABS=$(npm run editorctl -- call listAssetsOfType '{"type":"prefab"}' 2>/dev/null)
echo "Prefabs: $PREFABS"
```

### Multiple worktrees (dev mode)

```bash
# Terminal 1: Worktree A
cd /path/to/worktree-a
npm run start

# Terminal 2: Worktree B
cd /path/to/worktree-b
npm run start

# Terminal 3: Control worktree A
cd /path/to/worktree-a
npm run editorctl -- target  # ✓ Targets worktree A editor

# Terminal 4: Control worktree B
cd /path/to/worktree-b
npm run editorctl -- target  # ✓ Targets worktree B editor

# Terminal 5: Cross-worktree (fails in dev mode)
cd /path/to/worktree-a
npm run editorctl -- --port <worktree-b-port> target
# ✗ Validation error: different worktree
```

## Environment Variables

### `EDITOR_CONTROL_WS_PORT`

Default WebSocket port for editor control RPC.

- **Default**: `17870`
- **Usage**: Set before starting the editor to use a different port

```bash
# Start editor on custom port
EDITOR_CONTROL_WS_PORT=18000 npm run start

# Connect to custom port
npm run editorctl -- --port 18000 discover
```

In built mode without `--port`, `editorctl` will check `EDITOR_CONTROL_WS_PORT` as a fallback when no same-repo editor is found.

## Troubleshooting

### Connection errors

**Problem**: Cannot connect to editor

**Solutions**:

- Confirm the editor is running: `ps aux | grep electron`
- Check the WebSocket port: `npm run editorctl -- discover`
- Verify the port with `--port` flag: `npm run editorctl -- --port 17870 target`
- Check for firewall/network issues

### Discovery missing

**Problem**: `editorctl discover` returns empty list or errors about `getControlMeta`

**Solutions**:

- Update Tekton Editor to a version that supports control RPC
- Confirm editor is not running in E2E mode (Playwright)
- Check editor logs for control RPC initialization errors

### Worktree mismatch (dev mode)

**Problem**: Validation error about different worktree

**Solutions**:

- Verify you're in the correct worktree: `pwd`
- Start the editor from the same worktree: `npm run start`
- Use built `editorctl` for cross-worktree control
- Check `appLaunchDir` in discovery: `npm run editorctl -- discover --json`

### Method not found

**Problem**: Unknown method error when calling

**Solutions**:

- List available methods: `npm run editorctl -- methods`
- Check method spelling (case-sensitive, camelCase)
- Verify editor version supports the method
- Update editor to latest version

### Invalid parameters

**Problem**: Method call fails with parameter validation error

**Solutions**:

- View method schema: `npm run editorctl -- schema <method>`
- Get help with examples: `npm run editorctl -- help <method>`
- Ensure JSON is properly formatted and escaped
- Check required vs optional parameters

### Build errors

**Problem**: "Cannot find module .../dist/..." when running `editorctl`

**Solutions**:

- Rebuild packages: `npm run build:packages`
- Clean and rebuild: `rm -rf packages/*/dist && npm run build:packages`
- Check for TypeScript errors: `npm run typecheck`

## API Reference

See [@tekton/control-rpc-contract](../control-rpc-contract) for the complete control RPC method contract, including all available methods, input/output schemas, and TypeScript types.

For architecture and implementation details, see:

- [Editor Control Overview](../../docs/features/editorctl/editor-control-overview.md)
- [editorctl Documentation](../../docs/features/editorctl/editorctl.md)
