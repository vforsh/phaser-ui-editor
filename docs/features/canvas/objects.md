### Canvas Objects (Phaser-side)

Canvas “objects” are Phaser `GameObject`s that implement `IEditableObject` (see `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObject.ts`).

They are **editable** in the Tekton editor because they provide:

- **Stable identity**: `id` for selection, inspector lookup, clipboard, undo, prefab persistence.
- **A stable type discriminator**: `kind` (“Container”, “Image”, …). We use `kind` because Phaser already uses `type`.
- **Serializable state**: `toJson()` returns a JSON shape used for persistence + clipboard.
- **Reactive state**: `stateObj` is a `valtio` proxy of `toJson()` used by the Inspector and runtime.
- **Attachable behaviors**: `components` (`ComponentsManager`) stores “Unity-like” components. See `docs/features/canvas/components.md`.
- **High-frequency updates**: “visual-only” methods that update the Phaser object without touching reactive state (for drag/resize/rotate).

---

### Core building blocks

#### `IEditableObject` / `EDITABLE_SYMBOL`

- `EDITABLE_SYMBOL`: a symbol property set to `true` on editable objects.
- `isEditable(obj)`: runtime type guard: “is this Phaser object an editable object?”
- `isObjectOfType(obj, kind)`: narrows an `EditableObject` union to a specific `kind` (TypeScript helper).
- `EditableObject` union: all currently supported object classes.
- `EditableObjectJson` union: all supported serialization shapes.
- `isTintable(obj)`: runtime type guard for objects that support `tint` + `tintFill` (not all objects do).

#### `stateObj` + `StateChangesEmitter`

Every editable object keeps a `valtio` proxy state:

- `this._stateObj = proxy(this.toJson())`
- A `StateChangesEmitter(this._stateObj, callbacks)` subscribes to state changes and mirrors them back into the Phaser object.

The common pattern:

- **Inspector edits** mutate `stateObj` (valtio proxy).
- `StateChangesEmitter` sees the mutation and calls a callback.
- The callback updates Phaser fields (`x`, `y`, `angle`, `scaleX`, …).

To avoid loops, objects commonly implement a helper like `withoutEmits(...)` that temporarily disables `StateChangesEmitter` before mutating `stateObj` in response to imperative Phaser calls.

#### Visual-only updates (drag/resize/rotate)

`IEditableObject` defines “visual-only” methods:

- `setPositionVisualOnly`, `setAngleVisualOnly`, `setDisplaySizeVisualOnly`, `setOriginVisualOnly`, etc.

These are used during high-frequency interactions to avoid expensive UI re-renders (reactive state churn).

- **Rule**: callers must “commit” the final values to state once the interaction ends (usually by calling the non-visual `setPosition`, `setAngle`, etc.).

You can see this pattern in transform controls: `src/renderer/components/canvas/phaser/scenes/main/editContext/transformControls/interactions.ts`.

#### Components (`ComponentsManager`)

Each object has `obj.components` with a `ComponentsManager` instance. The object mirrors the component list into its JSON/state:

- When components are added/removed/reordered, `stateObj.components` is refreshed from `components.items`.

Full component architecture is documented in `docs/features/canvas/components.md`.

---

### Serialization / rehydration

#### `EditableObjectsFactory`

`src/renderer/components/canvas/phaser/scenes/main/objects/EditableObjectsFactory.ts` is the single place that:

- Creates new objects (generates unique `id`s; emits `'obj-registered'` / `'obj-destroyed'`).
- Rehydrates objects from JSON (`fromJson`).
- Rehydrates and attaches components (`initComponents`).
- Clones objects via `toJson()` + `fromJson()` (`clone()`).

`fromJson` uses the JSON `type` field (string literal in each JSON type) to pick the correct constructor.

#### `MainSceneFactory` (asset → object)

`src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneFactory.ts` is responsible for creating new objects from asset tree items (drag/drop, “insert from assets”, etc.):

- Loads required textures/fonts via the scene asset loader.
- Calls `objectsFactory.*(...)` for the concrete object type.
- Assigns a unique name for the active `EditContext`.

---

### Editing restrictions (component-driven locks)

Some components “own” certain properties (e.g. layout components control child `position` and sometimes `size`). This is implemented in:

- `src/renderer/components/canvas/phaser/scenes/main/objects/editing/editRestrictions.ts`

Highlights:

- `getEditLocksForObjectJson(...)` / `getEditLocksForRuntimeObject(...)`: returns a list of `EditLock`s describing what is locked and why.
- `trySetPositionUser(...)` / `trySetPositionUserVisualOnly(...)`: guard helpers that refuse to apply user transforms when locked.

If you add a new component that should lock editing, register a contributor via `registerComponentEditRestriction(...)`.

---

### Existing object types

This section documents each object under:

`src/renderer/components/canvas/phaser/scenes/main/objects/`

For each type you’ll see:

- **Purpose**
- **Key properties**
- **JSON shape**
- **Gotchas**

---

### `EditableContainer` (`kind: "Container"`)

**Purpose**

- A hierarchy node that can contain other editable objects.
- Used as the root of a prefab, groups, and layout targets.

**Key properties**

- **`editables`**: returns only editable children (`isEditable(child)`).
- **Hierarchy tracking**: on every scene update, it checks if `editables` changed and emits `'hierarchy-changed'`.
- **Events**:
    - `'editable-added'` / `'editable-removed'` when editable children are added/removed.
    - `'hierarchy-changed'` when editable child list changes.
    - `'size-changed'` when width/height changes.
    - Also supports base events: `'added-to-container'` / `'removed-from-container'`.
- **Prefab metadata**: `prefab: { id, name } | null` (tracks origin when created from a prefab file).
- **`isRoot`**: set for the “context root” containers (wires into edit contexts).
- **Origin**: containers do not support `setOrigin` (Phaser limitation).

**JSON shape** (`EditableContainerJson`)

- `type: "Container"`
- `id: string`
- `children: EditableObjectJson[]`
- `name: string`
- `prefab: { id: string; name: string } | null`
- `scale: { x: number; y: number }`
- `locked: boolean`
- `width`, `height`, `displayWidth`, `displayHeight`
- `components: EditableComponentJson[]`
- plus Phaser’s `toJSON()` fields (position, rotation, alpha, visible, etc.)

**Gotchas**

- **Hierarchy propagation**: when a child is also a container, its `'hierarchy-changed'` is forwarded to the parent, so deep tree edits bubble up.
- **State vs Phaser calls**: size/position/angle setters use `withoutEmits` to keep `stateObj` in sync without triggering emitter loops.
- **Visual-only origin**: `setOriginVisualOnly` is a no-op for containers.

---

### `EditableImage` (`kind: "Image"`)

**Purpose**

- Displays an image or spritesheet frame.

**Key properties**

- **`asset`**: prefab asset reference (`PrefabImageAsset | PrefabSpritesheetFrameAsset`).
- Supports **origin**, **scale**, **tint**, **alpha**, **rotation/angle**, **position**.
- `isResizable: true` (display size changes are supported).

**JSON shape** (`EditableImageJson`)

- `type: "Image"`
- `id: string`
- `asset: PrefabImageAsset | PrefabSpritesheetFrameAsset`
- `scale: { x: number; y: number }`
- `originX`, `originY`
- `tint`, `tintFill`
- `locked: boolean`
- `width`, `height`, `displayWidth`, `displayHeight`
- `components: EditableComponentJson[]`
- plus Phaser’s `toJSON()` fields (including `textureKey` / `frameKey` coming from Phaser JSON).

**Gotchas**

- **Frame changes are TODO**: `frameKey` changes update the frame, but the `asset` reference is not updated yet (see TODOs).
- Prefer state-driven setters (`setTint`, `setAngle`, etc.) that keep `stateObj` consistent.

---

### `EditableNineSlice` (`kind: "NineSlice"`)

**Purpose**

- A scalable 9-patch (aka 9-slice) image for UI panels/buttons.
- Backed by `@koreez/phaser3-ninepatch`’s `NinePatch`.

**Key properties**

- **`asset`**: prefab asset reference (`PrefabImageAsset | PrefabSpritesheetFrameAsset`).
- Width/height are controlled via `resize(width, height)`.
- `isResizable: true`.
- Does **not** support `setOrigin` (treated like container in origin editing).

**JSON shape** (`EditableNineSliceJson`)

- `type: "NineSlice"`
- `id: string`
- `asset: PrefabImageAsset | PrefabSpritesheetFrameAsset`
- `ninePatchConfig: IPatchesConfig`
- `width`, `height`, `displayWidth`, `displayHeight` (display size is effectively width/height)
- `tint`, `tintFill`
- `locked: boolean`
- `scale: { x: number; y: number }`
- `components: EditableComponentJson[]`
- plus Phaser’s `toJSON()` fields, plus `textureKey` / `frameKey` captured from the underlying NinePatch internals.

**Gotchas**

- **display size hack**: `displayWidth` / `displayHeight` are overridden to return `width` / `height`. This is required for selection + transform controls to behave correctly.
- **Origin editing**: `setOriginVisualOnly` is a no-op; origin handles should be disabled for this type (see `canChangeOrigin` helpers).
- **Frame/texture switching is TODO**: JSON stores keys, but runtime switching isn’t fully implemented yet.

---

### `EditableText` (`kind: "Text"`)

**Purpose**

- Text rendered via Phaser `Text` using web fonts.

**Key properties**

- **`asset`**: `PrefabWebFontAsset` (font metadata).
- **Style**: nested `style` JSON (`EditableTextStyleJson`) mirrors Phaser’s `TextStyle`.
- `isResizable: false` (text doesn’t support `setSize` in Phaser 3.60; selection/resize uses scale/display size instead).
- Two `StateChangesEmitter`s:
    - One on the object’s root state (position, angle, etc.).
    - One on `stateObj.style` for style fields (font size, color, stroke, shadow, etc.).

**JSON shape** (`EditableTextJson`)

- `type: "Text"`
- `id: string`
- `asset: PrefabWebFontAsset`
- `text: string`
- `style: EditableTextStyleJson`
- `lineSpacing`, `letterSpacing`
- `paddingX`, `paddingY`
- `wordWrapWidth`, `wordWrapUseAdvanced`
- `originX`, `originY`
- `scale: { x: number; y: number }`
- `tint`, `tintFill`
- `locked: boolean`
- `width`, `height`, `displayWidth`, `displayHeight`
- `components: EditableComponentJson[]`
- plus Phaser’s `toJSON()` fields.

**Gotchas**

- **Not resizable via `setSize`**: `setSizeVisualOnly` is a no-op; if you want interactive resizing, use `setDisplaySize`/scaling.
- **Font changes are TODO**: `fontFamily` updates change the text style but don’t update the prefab asset reference yet.

---

### `EditableBitmapText` (`kind: "BitmapText"`)

**Purpose**

- Bitmap font text rendered via Phaser `BitmapText` (pixel fonts / BMFont).

**Key properties**

- **`asset`**: `PrefabBitmapFontAsset`.
- BitmapText-specific editable fields: `font`, `fontSize`, `align`, `maxWidth`, `letterSpacing`, `lineSpacing`, `text`.
- `isResizable: true` (but resizing is implemented via scaling, not native sizing).
- Updates the input hit area when text metrics change (`updateInputHitArea()`).

**JSON shape** (`EditableBitmapTextJson`)

- `type: "BitmapText"`
- `id: string`
- `asset: PrefabBitmapFontAsset`
- `text: string`
- `font: string`
- `fontSize: number`
- `align: number`
- `maxWidth: number`
- `letterSpacing: number`
- `lineSpacing: number`
- `originX`, `originY`
- `scale: { x: number; y: number }`
- `tint`, `tintFill`
- `locked: boolean`
- `width`, `height`, `displayWidth`, `displayHeight`
- `components: EditableComponentJson[]`
- plus Phaser’s `toJSON()` fields.

**Gotchas**

- **Display size workaround**: `setDisplaySize(...)` is implemented using a Phaser PR approach (scale derived from text bounds). Prefer `setDisplaySize(...)` over writing `displayWidth`/`displayHeight` directly if you need state consistency.
- **Hit area**: if you add new fields that impact text bounds, ensure you call `updateInputHitArea()` when they change.

---

### Shared helpers in `objects/`

#### `StateChangesEmitter`

`src/renderer/components/canvas/phaser/scenes/main/objects/StateChangesEmitter.ts`

- Subscribes to a `valtio` proxy via `subscribe(state, ...)`.
- Emits per-path callbacks keyed by dot paths (`"scale.x"`, `"originX"`, etc.).
- Supports temporarily disabling callbacks via `emitsEnabled` (used by “withoutEmits” patterns).

#### `PhaserAlign`

`src/renderer/components/canvas/phaser/scenes/main/objects/PhaserAlign.ts`

- Maps friendly align keys (`"top-left"`, `"center"`, …) to `Phaser.Display.Align.*` constants.

---

### How to add a new object type

This section covers adding a brand-new `EditableObject` implementation that:

- participates in serialization/deserialization (`toJson()` + `fromJson(...)`),
- supports Inspector edits via `stateObj`,
- supports clipboard (`CanvasClipboard`) and cloning (`EditableObjectsFactory.clone`).

#### 1) Create the object class

Create a new file in:

- `src/renderer/components/canvas/phaser/scenes/main/objects/Editable<MyType>.ts`

Implementation checklist:

- **Implement `IEditableObject`**
    - `public readonly [EDITABLE_SYMBOL] = true`
    - `public readonly kind = '<KindName>'` (e.g. `'Button'`)
    - `public readonly id: string`
    - `private _isLocked = false`
    - `private _components = new ComponentsManager(this)`
    - `private _stateObj = proxy(this.toJson())`
    - `private _stateChanges = new StateChangesEmitter(this._stateObj, { ...callbacks... })`
- **Keep `stateObj.components` in sync**
    - Listen to `component-added` / `component-removed` / `component-moved` and update `this._stateObj.components = this._components.items.map((c) => c.state)`.
- **Use guard clauses (“return early”)**
    - Prefer `if (!this._stateObj || !this._stateChanges) return` style to avoid nesting.
- **Add a `withoutEmits(...)` helper**
    - Use `this._stateChanges.emitsEnabled = false` while you sync `stateObj` from imperative Phaser calls.
- **Implement visual-only methods**
    - `setPositionVisualOnly`, `setAngleVisualOnly`, `setDisplaySizeVisualOnly`, etc. should only touch the Phaser object.
- **Set `isResizable` correctly**
    - If transform controls should allow resize, return `true` and ensure `displayWidth` / `displayHeight` behave predictably for bounds calculations.
- **Destroy cleanup**
    - Call `this._stateChanges.destroy()` and `this._components.destroy()` in `destroy(...)`.

#### 2) Define the JSON type

At the bottom of your class file, export a JSON type using `CreateEditableObjectJson`:

- Must include:
    - `type: '<TypeName>'` (string literal used for `fromJson` matching)
    - `id: string`
    - `locked: boolean`
    - `components: EditableComponentJson[]`
- Add your additional fields (assets, custom config, etc.).

#### 3) Register the new type in `EditableObject.ts`

Update `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObject.ts`:

- Import your new class + JSON type.
- Extend unions:
    - `EditableObject = ... | EditableMyType`
    - `EditableObjectJson = ... | EditableMyTypeJson`
- Update helper switches if relevant:
    - `canChangeOrigin(type)` if your object can/can’t support origin.
    - `canChangeScale(type)` if your object can/can’t scale.
    - `isTintable(...)` if your object supports tint fields.

#### 4) Wire creation + rehydration in `EditableObjectsFactory`

Update `src/renderer/components/canvas/phaser/scenes/main/objects/EditableObjectsFactory.ts`:

- Import your class + JSON type.
- Add a creation method (like `image(...)`, `text(...)`, etc.) if needed.
- Extend `fromJson(...)`’s `match(json)` to include `{ type: '<TypeName>' }`.
- Add a `createMyTypeFromJson(json: EditableMyTypeJson): EditableMyType` method.
- Ensure `this.initComponents(obj, json.components)` is called.

Once this is done, the following “just work”:

- Clipboard copy/paste (`CanvasClipboard` uses `toJson()` and `fromJson()`).
- Cloning (`EditableObjectsFactory.clone` uses `toJson()` + `fromJson()`).

#### 5) Wire asset-driven creation (optional)

If the new object should be creatable from the Assets panel (drag/drop or “insert from assets”), update:

- `src/renderer/components/canvas/phaser/scenes/main/mainScene/MainSceneFactory.ts`

Add a new `match(asset)` branch and a corresponding `createFromX(...)` method that:

- loads runtime resources (textures/fonts/etc.),
- constructs the object via `objectsFactory`,
- sets a unique name via `getNewObjectName(...)`.

#### 6) Sanity checks

- **Selection bounds**: ensure bounds calculation works with your object’s `displayWidth`/`displayHeight` (see `src/renderer/components/canvas/phaser/scenes/main/editContext/Transformable.ts`).
- **Transform controls**: if origin is unsupported, make sure it’s blocked via `canChangeOrigin(...)` and your `setOriginVisualOnly` is a safe no-op.
- **Edit locks**: if your object is meant to be controlled by a component (layout, etc.), use the `editRestrictions` helpers when applying user transforms.
