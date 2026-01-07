# Implementation plan: `EditableGraphics` (Rectangle / Ellipse) + Inspector sections

Target feature: new editable canvas object backed by `Phaser.GameObjects.Graphics` ([Phaser docs](https://docs.phaser.io/api-documentation/class/gameobjects-graphics)).

Primary refs:

- `docs/features/canvas/objects.md` (object architecture + how to add a new type)
- Existing patterns: `src/renderer/components/canvas/phaser/scenes/main/objects/EditableImage.ts`, `EditableNineSlice.ts`

Goals (from Vlad)

- Add a new editable object: **Graphics**
    - **Shapes**: Rectangle (supports rounded corners) + Ellipse (only)
    - **Inspector sections**:
        - `GraphicsShape`
        - `GraphicsFill`
        - `GraphicsStroke`
- Creation via canvas context menu in `src/renderer/components/canvas/Canvas.tsx`:
    - Add → Graphics → Rectangle / Ellipse
    - New object should appear at the **right-click position** (world coords), selected, undoable.

Non-goals

- No arbitrary paths / polygons / lines yet (only Rect + Ellipse).
- No baking to textures (`generateTexture`) or perf optimizations beyond “don’t redraw unnecessarily”.
- No gradient fills for now (solid fill or none).
- No special stroke alignment modes unless it’s trivially supported (default “center on edge” is fine).

---

## 0) Data model (JSON + state)

We’ll model this as **one `EditableGraphics` = one shape** (rect OR ellipse). This matches your “1a” choice and keeps selection, inspector, and undo predictable.

### 0.1 JSON type

Create `EditableGraphicsJson` with `type: "Graphics"` and the standard editable fields:

- **identity**: `id: string`
- **transform**:
    - `x`, `y` (from Phaser JSON base)
    - `angle: number`
    - `scale: { x: number; y: number }`
    - `originX`, `originY` included for editor uniformity, but **origin is a no-op** for Graphics:
        - keep it fixed at `0.5` in runtime (`canChangeOrigin('Graphics') === false`)
        - inspector origin inputs will be disabled automatically
- **size** (your “2a”): `width`, `height`, plus `displayWidth`, `displayHeight` (derived; kept in JSON for consistency with other objects)
- **graphics-specific**:
    - `shape`:
        - `type: "rectangle" | "ellipse"`
        - rectangle:
            - `cornerRadius`: supports **simple + advanced** (“4c”)
                - `mode: "simple" | "advanced"`
                - `simple: number`
                - `advanced: { tl: number; tr: number; br: number; bl: number }`
        - ellipse:
            - no extra fields beyond width/height
    - `fill` (your “6a + 6c”):
        - `enabled: boolean`
        - `color: number` (0xRRGGBB)
        - `alpha: number` (0..1)
    - `stroke` (your “7a + 7b”):
        - `enabled: boolean`
        - `color: number`
        - `alpha: number`
        - `width: number`
        - `lineJoin: "miter" | "bevel" | "round"`
        - `lineCap: "butt" | "square" | "round"`
        - `miterLimit: number`
        - (optional later) `alignment: "center" | "inside" | "outside"` (default `center`)
- **common**:
    - `locked: boolean`
    - `components: EditableComponentJson[]`
    - `depth`, `blendMode` (match other objects)

Notes:

- Phaser `Graphics` doesn’t have a real origin component. For editor math (`selection-frame`, layout, aligner) we need `originX/Y` to exist; we’ll treat it as **fixed** \(0.5, 0.5\) and keep consistent via runtime getters / state mirror.
- `displayWidth/Height` should track \(abs(width _ scale.x)\) / \(abs(height _ scale.y)\), and setters should update the underlying base size in a predictable way.

---

## 1) New object implementation: `EditableGraphics`

### 1.1 New file

Add:

- `src/renderer/components/canvas/phaser/scenes/main/objects/EditableGraphics.ts`

Pattern: mirror `EditableImage` + `docs/features/canvas/objects.md` checklist:

- `implements IEditableObject`
- `EDITABLE_SYMBOL` marker
- `kind = "Graphics"`
- `ComponentsManager`
- `stateObj = proxy(this.toJson())`
- `StateChangesEmitter` mapping state → runtime updates
- Visual-only setters (`setPositionVisualOnly`, etc.) to avoid reactive churn during interactions

### 1.2 Runtime representation

Use `Phaser.GameObjects.Graphics` as the backing object and draw the shape in local space around the object origin point:

- Keep `x/y` as the object’s center in world space.
- Draw centered at local \(0,0\):
    - Rectangle: draw at \(x=-w/2, y=-h/2\)
    - Ellipse: draw at center \(0,0\) with `width/height`

This keeps resize/rotate math consistent with selection bounds and reduces special-casing elsewhere.

### 1.3 Redraw strategy

Implement a single private `redraw()` that:

- `clear()`
- If fill enabled: `fillStyle(color, alpha)` then draw shape fill:
    - Rect: `fillRoundedRect(x, y, w, h, radius)` (use advanced radius object when in advanced mode)
    - Ellipse: `fillEllipse(0, 0, w, h)`
- If stroke enabled:
    - `lineStyle(width, color, alpha)` plus cap/join/miter
    - Rect: `strokeRoundedRect(...)`
    - Ellipse: `strokeEllipse(0, 0, w, h)`

Important: only call `redraw()` when a relevant field changes (shape/size/fill/stroke).

### 1.4 `StateChangesEmitter` callbacks

State → runtime update map (guard clauses / “return early”):

- `x`, `y` → `this.setPosition(...)`
- `angle` → `this.setAngle(...)`
- `scale.x`, `scale.y` → `this.setScale(...)` + recompute display size in state (see below)
- `width`, `height` → update internal size + `redraw()`
- `fill.*` → `redraw()`
- `stroke.*` → `redraw()`
- `locked` → mirror `_isLocked`
- `components` syncing: same pattern as other objects (listen to component manager events and refresh `stateObj.components`)

### 1.5 Width/height + displayWidth/height contract

Editor tooling assumes `displayWidth` / `displayHeight` exist and are resizable (transform controls).

Implement in `EditableGraphics`:

- `get displayWidth()`: \(abs(state.width \* scaleX)\)
- `set displayWidth(value)`:
    - guard: if `scaleX === 0` return early
    - set `width = abs(value / scaleX)` inside `withoutEmits` + `redraw()`
- same for height
- `setDisplaySize(w, h)` delegates to the displayWidth/displayHeight setters
- `isResizable = true`

### 1.6 Origin no-op but compatibility fields exist

To keep the rest of the editor stable:

- include `originX/originY` in JSON always
- `canChangeOrigin('Graphics') === false` so inspector + transform controls won’t try to edit it
- runtime:
    - keep `originX/originY` fixed at `0.5` in `toJson()`
    - `setOriginVisualOnly` is a no-op

### 1.7 Hit testing (selection on click)

Start simple and reliable:

- Make the Graphics object interactive with a geometry hit area approximating bounds:
    - Rectangle → `new Phaser.Geom.Rectangle(-w/2, -h/2, w, h)`
    - Ellipse → `new Phaser.Geom.Ellipse(0, 0, w, h)` with a custom `contains` callback
- Update the hit area any time width/height/shape changes.

This gives predictable selection and avoids heavy per-pixel hit testing.

---

## 2) Wire into editable object system (unions + factory)

### 2.1 Extend `EditableObject` unions/helpers

Update:

- `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObject.ts`

Changes:

- import `EditableGraphics`, `EditableGraphicsJson`
- extend unions:
    - `EditableObject = ... | EditableGraphics`
    - `EditableObjectJson = ... | EditableGraphicsJson`
- update helpers:
    - `canChangeOrigin('Graphics') => false`
    - `canChangeScale('Graphics') => true`
    - `isTintable` remains unchanged (Graphics uses fill/stroke, not tint)

### 2.2 Extend `EditableObjectsFactory`

Update:

- `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObjectsFactory.ts`

Add:

- creation helpers:
    - `graphicsRectangle(): EditableGraphics`
    - `graphicsEllipse(): EditableGraphics`
    - (internally) `graphics(shape: ...)`
- extend `fromJson(...)` match to include `{ type: "Graphics" }`
- `createGraphicsFromJson(json: EditableGraphicsJson): EditableGraphics`
- ensure `initComponents(obj, json.components)` runs.

---

## 3) Creation via canvas context menu (`Canvas.tsx`)

We already have a main-process menu returning `{ action: 'rectangle' | 'ellipse' | null }` (`src/main/ipc/handlers.ts`). The renderer currently only logs.

### 3.1 Add a new app command

Update `src/renderer/AppCommands.ts`:

- Add a command dedicated to canvas-menu creation:

```ts
'create-graphics-at': (data: { shape: 'rectangle' | 'ellipse'; canvasPos: { x: number; y: number } }) => string | undefined
```

Rationale: `create-object` currently only supports Containers and is “hierarchy-clicked-object”-based. We need a spawn position.

### 3.2 Implement handler in `MainScene`

Update `src/renderer/components/canvas/phaser/scenes/main/MainScene.ts`:

- in `setupAppCommands()`, add:
    - `appCommands.on('create-graphics-at', (data) => this.ops.createGraphicsAt(data), ...)`

### 3.3 Implement op: `createGraphicsAt`

Update `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneSelectionOps.ts`:

- Add `createGraphicsAt(data)` that:
    - Resolves current edit context target:
        - guard: if no current context or target is super root → return early (same “super root not allowed” rule)
    - Converts `canvasPos` → world coords:
        - `const world = this.deps.scene.cameras.main.getWorldPoint(canvasX, canvasY)`
    - Creates object via `objectsFactory.graphicsRectangle/graphicsEllipse()`
    - `newObj.setPosition(world.x, world.y)`
    - Assigns a unique name via existing `getNewObjectName(...)`
    - Adds to `editContext.target`
    - Sets selection to the new object
    - Wraps in undo snapshot push (pattern already used in `createObject`, `duplicateObject`)

### 3.4 Emit command from `Canvas.tsx`

Update `src/renderer/components/canvas/Canvas.tsx`:

- In `openCanvasContextMenu`, after receiving result:
    - compute canvas-local coords:
        - `const rect = canvasRef.current?.getBoundingClientRect()`
        - `canvasX = event.clientX - rect.left`
        - `canvasY = event.clientY - rect.top`
    - emit:
        - `appCommands.emit('create-graphics-at', { shape: 'rectangle', canvasPos: { x: canvasX, y: canvasY } })`
    - same for ellipse

---

## 4) Inspector UI: Shape / Fill / Stroke sections

### 4.1 New section components

Add:

- `src/renderer/components/inspector/sections/objects/GraphicsShapeSection.tsx`
- `src/renderer/components/inspector/sections/objects/GraphicsFillSection.tsx`
- `src/renderer/components/inspector/sections/objects/GraphicsStrokeSection.tsx`

Implementation notes:

- Use `useSnapshot(data)` like existing sections.
- For colors: follow `DisplaySection`’s `ColorInput` approach (`'#' + num.toString(16)`).
- Keep controls minimal and “obviously correct”:
    - Shape:
        - Select: Rectangle / Ellipse
        - Width/Height inputs
        - If Rectangle: corner radius UI
            - default show “Radius” (simple)
            - add “Advanced corners” toggle to expose TL/TR/BR/BL
    - Fill:
        - Enabled checkbox
        - Color + Alpha
    - Stroke:
        - Enabled checkbox
        - Width, Color, Alpha
        - Line cap/join (Select)
        - Miter limit (Number)

### 4.2 Wire into inspector section typing

Update `src/renderer/components/inspector/InspectorSection.tsx`:

- Import `EditableGraphicsJson` and any nested JSON helper types if you export them (optional).
- Extend `ObjectSectionDef` union with:
    - `{ type: 'obj-graphics-shape'; data: EditableGraphicsJson }`
    - `{ type: 'obj-graphics-fill'; data: EditableGraphicsJson['fill'] }`
    - `{ type: 'obj-graphics-stroke'; data: EditableGraphicsJson['stroke'] }`

### 4.3 Wire into inspector panel section creation

Update `src/renderer/components/inspector/InspectorPanel.tsx`:

- Import the new section components.
- In `getObjectSections(obj)` add a `match` case:
    - `.with({ type: 'Graphics' }, (graphics) => [ ...three section defs... ])`

Suggested order:

1. GraphicsShape (expanded by default)
2. GraphicsFill (expanded by default)
3. GraphicsStroke (expanded by default)

---

## 5) Testing / verification loop

### 5.1 Manual sanity checks (quick)

- Right-click canvas → Add → Graphics → Rectangle
    - created at click position
    - selected
    - undo removes it
- Same for Ellipse.
- Inspector:
    - Fill enabled/disabled updates rendering immediately
    - Stroke width/color changes update rendering immediately
    - Shape section changes width/height; transform resize handles still work
- Selection bounds look correct while rotating and resizing.

### 5.2 Editorctl-driven checks (repeatable)

Use the standard flow from workspace docs:

- `npm run editorctl -- listEditors`
- Open testbed project if needed:
    - `npm run editorctl -- --port <wsPort> call openProject '{"path":"/Users/vlad/dev/papa-cherry-2"}'`

Then:

- Create a rectangle via UI, tweak fill/stroke, take a screenshot:
    - `npm run editorctl -- --port <wsPort> call takeAppScreenshot '{"format":"png"}'`

Optional: run `eikon` on the screenshot to catch any inspector layout regressions.

---

## 6) Acceptance criteria (definition of done)

- New object type **Graphics** is fully integrated:
    - serializable (`toJson`)
    - rehydratable (`fromJson`)
    - selectable + transformable
    - undoable
- Canvas context menu creates:
    - Rectangle / Ellipse at right-click location
    - object auto-selected
- Inspector shows and edits:
    - `GraphicsShape`, `GraphicsFill`, `GraphicsStroke`
    - Rectangle supports rounded corners (simple + advanced)
