# Prefabs

read_when: onboarding to prefab concepts, reviewing editor behavior, or explaining prefab workflows to non-engineers.

## What a prefab is

A prefab is a reusable UI building block. Think of it as a packaged group of objects that can be placed many times across other prefabs. Each instance stays linked to its source, so updates flow through without manual copy/paste.

## Why prefabs exist

- Reuse: build once, place many times.
- Consistency: style and layout stay aligned across screens.
- Speed: iterate on a component and see it update everywhere.
- Safety: changes are scoped; instance tweaks don’t rewrite the source.

## How the system behaves (high level)

- A prefab file stores the source layout and assets for a component.
- When you place a prefab inside another prefab, the editor inserts an instance placeholder.
- At runtime (in the editor), that instance expands into real editable objects.
- Any edits you make inside the instance are recorded as overrides rather than rewriting the source prefab.
- When you save, the parent prefab stores those overrides alongside the instance reference.

## Instances vs. source

- Source prefab: the master definition. Editing it updates all instances.
- Instance: a placed copy that can carry local overrides (position, visibility, text, etc.).
- Instances never own their own children; they only store “what’s different” from the source.

## Overrides (conceptual)

- Overrides are small, local changes applied on top of the source prefab.
- They are saved with the parent prefab, not inside the source prefab.
- This keeps the source clean and lets instances diverge only where needed.

## Nested prefabs

- Prefabs can contain other prefabs.
- The system keeps overrides scoped so a change in a nested instance stays tied to the correct source component.
- This allows complex UI trees while preserving clear ownership of changes.

## Editing rules (user-facing)

- Instance root (the placed prefab itself): rename/move/delete/duplicate/reorder/group/ungroup at the parent level is allowed.
- Inside an instance: property edits are allowed (size, position, text, visibility, etc.).
- Inside an instance: structural edits are blocked (add/remove/reparent/duplicate/paste into).
- If you need a structural change, open the source prefab and edit it there.

## Saving and updates

- Saving a prefab captures two things:
    - The source layout (for the prefab you opened).
    - Any overrides for prefab instances inside it.
- When a source prefab changes, all instances update, and their overrides re-apply.

## Mental model

- Prefab = blueprint.
- Instance = placed blueprint with sticky notes.
- Overrides = sticky notes.
- Source edits update the blueprint; sticky notes stay attached to the instance.

## Common workflows

- Create a base component (button, card, panel) as a prefab.
- Place it in other prefabs.
- Tweak instance properties to fit context.
- If many instances need the same change, edit the source prefab once.
