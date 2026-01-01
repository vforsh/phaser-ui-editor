### Canvas Components (Phaser-side)

Components are **attachable behaviors** for `EditableObject`s in the Phaser canvas. They encapsulate:

- **Runtime logic** (listening to object/container events and applying changes)
- **Serializable state** (JSON that is saved inside the object)
- **Two-way binding** with the Inspector (Inspector edits the same reactive state object the runtime listens to)

This is conceptually similar to “Unity components”, but implemented as plain TypeScript classes.

---

### Core building blocks

- **`BaseEditableComponent`** (`src/components/canvas/phaser/scenes/main/objects/components/base/BaseEditableComponent.ts`)
  - Defines the component lifecycle (`onAdded`, `activate`, `deactivate`, `destroy`).
  - Owns a **valtio proxy state** (`this._state`) created from `toJson()` via `createState()`.
  - Provides abort signals:
    - `destroySignal`: aborted when the component is destroyed (final cleanup).
    - `deactivateSignal`: passed into `onActivate(...)`, aborted when the component is deactivated (pause/temporary cleanup).
  - Runs **pre-add checks** (`PreAddChecksFactory`) to validate that the target object supports the component.

- **`ComponentsManager`** (`src/components/canvas/phaser/scenes/main/objects/components/base/ComponentsManager.ts`)
  - Lives on every `EditableObject` (`obj.components`).
  - Stores a list of component instances and enforces **“one component per type per object”**.
  - Emits events when the list changes: `component-added`, `component-removed`, `component-moved`.

- **Factories**
  - `EditableComponentsFactory` (`.../components/base/EditableComponentsFactory.ts`):
    - Creates new component instances by type (`create(type)`).
    - Rehydrates components from JSON (`fromJson(json)`).
    - Generates stable component `id`s (used for serialization/copy-paste).
  - `EditableObjectsFactory` (`.../objects/EditableObjectsFactory.ts`):
    - Rehydrates objects from JSON and calls `initComponents(obj, json.components)` to attach components.

---

### How state + Inspector binding works

Each `EditableObject` owns a reactive `stateObj` (valtio proxy) representing its JSON. Components participate in that JSON:

- When a component is added/removed/moved, the object updates `stateObj.components` from the current manager list.
- Each component also has its own `state` object (valtio proxy) that mirrors `toJson()` and is stored into `stateObj.components`.
- The Inspector renders component UIs from `obj.components` (the JSON array), and user edits mutate that proxy directly.

Runtime reacts to Inspector edits via `StateChangesEmitter`:

- Component constructors typically:
  - Apply `initialState` into internal fields (`this.x = ...`, etc.)
  - Create `this._state = this.createState()`
  - Create a `StateChangesEmitter(this._state, { ...callbacks... }, this.destroySignal)`
- When Inspector updates `data.someField = ...`, the emitter callback updates internal fields and applies changes to Phaser objects.

This creates a **single source of truth**:

- **Inspector → state proxy mutation → runtime callbacks → Phaser object updates**

---

### Component lifecycle

#### Attach (Add)

1. UI emits `appCommands.emit('add-component', { componentType, objectId })`.
2. `MainScene` creates the component via `componentsFactory.create(type)`.
3. `ComponentsManager.add()`:
   - Guard: no duplicate `type`
   - `comp.canBeAddedTo(obj)` (runs pre-add checks)
   - `comp.onAdded(obj)` (attaches the component)
   - Adds to list and emits `component-added`

#### Activate / Deactivate

- Components have an `active` boolean in their JSON.
- When `active` changes in the Inspector, the component’s `StateChangesEmitter` typically calls:
  - `value ? this.activate() : this.deactivate()`
- `activate()` calls `onActivate(deactivateSignal, firstTime=false)`.
- `deactivate()` aborts `deactivateSignal` and calls `onDeactivate()`.

Use **activation** for things like “temporarily stop listening/updating”, without losing component state.

#### Remove / Destroy

- Removing a component uses `ComponentsManager.remove(type)`, which calls `comp.onRemoved()`.
- Default `BaseEditableComponent.onRemoved()` calls `destroy()`.
- `destroy()` aborts `destroySignal` and detaches the component from the object reference.

---

### Serialization / rehydration

Components are part of the editable object JSON:

- `EditableObject.toJson()` includes `components: this._components.items.map((c) => c.toJson())`.
- On load/restore/clone, `EditableObjectsFactory.initComponents(obj, json.components)`:
  - `componentsFactory.fromJson(componentJson)`
  - `obj.components.add(component)`

Because `stateObj` is a proxy of `toJson()`, “saved state” is always aligned with what the Inspector is editing.

---

### Existing components (in `src/components/canvas/phaser/scenes/main/objects/components/`)

- **Horizontal Layout** (`HorizontalLayoutComponent`)
  - Applies a “row layout” to children of a container.
  - Listens to `hierarchy-changed` on the container to recompute layout.
  - Uses pre-add checks to prevent conflicting layouts on the same object.

- **Vertical Layout** (`VerticalLayoutComponent`)
  - Applies a “column layout” to children of a container.
  - Listens to `hierarchy-changed` and prevents conflicting layouts.

- **Grid Layout** (`GridLayoutComponent`)
  - Applies a grid layout to children of a container (with optional centering of the last row).
  - Listens to `hierarchy-changed` and prevents conflicting layouts.

---

### Adding a new component (checklist)

1. **Create the component class**
   - Location: `src/components/canvas/phaser/scenes/main/objects/components/`
   - Extend `BaseEditableComponent<MyComponentJson>`
   - Define `public readonly type = 'my-component-type' as const`
   - Implement:
     - `toJson(): MyComponentJson`
     - `onActivate(deactivateSignal, firstTime)` (use guard clauses)
     - `onDeactivate()`
   - Add any `this._preAddChecks.push(...)` rules (object type, conflicts, requirements).

2. **Create a JSON type**
   - Must include at least: `type`, `id`, `active`, plus your fields.

3. **Wire reactive state**
   - `this._state = this.createState()`
   - `new StateChangesEmitter(this._state, { 'field': (value) => ... }, this.destroySignal)`
   - Prefer updating internal fields + applying to Phaser objects from those callbacks.

4. **Register it in component unions**
   - Update `.../components/base/EditableComponent.ts`:
     - `EditableComponent` union
     - `EditableComponentJson` union
     - (and `EditableComponentType` if it’s a new type)

5. **Register it in factories**
   - Update `EditableComponentsFactory.create(type)` and `.fromJson(json)`

6. **Expose it in the Inspector**
   - Add metadata in `src/components/inspector/sections/components/ComponentsListData.ts` (title, icon, group).
   - Add a section renderer in `InspectorPanel.getComponentSections(...)`.
   - Implement the UI section component that edits the component JSON proxy fields.

---

### Common pitfalls

- **No runtime reaction to Inspector edits**: ensure component `this._state` is a valtio proxy (`createState()`), and your `StateChangesEmitter` callback keys match the JSON paths (`'spacingX'`, `'scale.x'`, etc.).
- **Leaking listeners**: always scope event subscriptions with `this.destroySignal` (or `deactivateSignal` for “active-only” listeners).
- **Conflicting behaviors**: use `PreAddChecksFactory.requireNoComponentOfType(...)` to prevent invalid combinations (e.g. multiple layout components).
