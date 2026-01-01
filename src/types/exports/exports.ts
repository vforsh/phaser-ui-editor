// it is important to use the relative paths in imports, not path aliases like '@components/*'
// because the types are exported as a .d.ts file and need to be available for the consumers of the library

import { EditableComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import { GridLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/GridLayoutComponent'
import { HorizontalLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/HorizontalLayoutComponent'
import { VerticalLayoutComponentJson } from '../../components/canvas/phaser/scenes/main/objects/components/VerticalLayoutComponent'
import { EditableBitmapTextJson } from '../../components/canvas/phaser/scenes/main/objects/EditableBitmapText'
import { EditableContainerJson } from '../../components/canvas/phaser/scenes/main/objects/EditableContainer'
import { EditableImageJson } from '../../components/canvas/phaser/scenes/main/objects/EditableImage'
import { EditableNineSliceJson } from '../../components/canvas/phaser/scenes/main/objects/EditableNineSlice'
import { EditableObjectJson } from '../../components/canvas/phaser/scenes/main/objects/EditableObject'
import { EditableTextJson } from '../../components/canvas/phaser/scenes/main/objects/EditableText'
import { PrefabFile } from '../prefabs/PrefabFile'

export type {
	EditableBitmapTextJson,
	EditableComponentJson,
	EditableContainerJson,
	EditableImageJson,
	EditableNineSliceJson,
	EditableObjectJson,
	EditableTextJson,
	GridLayoutComponentJson,
	HorizontalLayoutComponentJson,
	PrefabFile,
	VerticalLayoutComponentJson,
}
