# Component Section

The <ComponentSection> component is used to inspect and edit the components of an EditableObject.

It will be a child of the <InspectorPanel> component.

It should look like <InspectorSection> component but with the following differences:

- It will have an activation checkbox next to the component name in the header to activate/deactivate the component
- It will have a help/info icon button in the header to tooltip with the component info
- It will have a button on the right side the will open a context menu (more about it below)

## Context menu

The context menu will have the following options:

- Reset
- --- DIVIDER ---
- Move up
- Move down
- Remove
- --- DIVIDER ---
- Copy
- Paste
