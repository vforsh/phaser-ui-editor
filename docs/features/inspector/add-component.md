# Add Component

When the object is selected in the InspectorPanel, add the big wide "Add Component" button below all object the sections.

When a user clicks on this button, the component list should appear. Data for all available components is located at `src/components/inspector/sections/components/ComponentsListData.ts`.

## Component List

The component list is a vertical list of components with a search bar on top.

The list is scrollable and the search bar is filterable.

The components should be grouped by the `group` property from the data.

When displaying ComponentListItem, display its icon on the left side and the title right next to it.

When clicking on a ComponentListItem, the component should be added to the object and the component list should be closed.

## Keyboard Navigation

When the user presses the ESC key, the list should be closed.

When the user presses the Tab key, the focus should move from search input to the first item in the filtered list.

Users should be able to navigate between list items with the up and down arrow keys.

When the user presses the Enter key, the selected component should be added to the object and the list should be closed.
