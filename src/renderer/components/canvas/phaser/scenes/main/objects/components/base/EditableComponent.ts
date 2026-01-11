import type { EditableComponentJson } from '@tekton/runtime'

import { GridLayoutComponent } from '../GridLayoutComponent'
import { HorizontalLayoutComponent } from '../HorizontalLayoutComponent'
import { LayoutComponent } from '../LayoutComponent'
import { VerticalLayoutComponent } from '../VerticalLayoutComponent'

export type EditableComponent = HorizontalLayoutComponent | VerticalLayoutComponent | GridLayoutComponent | LayoutComponent

export type EditableComponentType = EditableComponent['type'] | 'localization' | 'input'
