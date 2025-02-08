import { EditablePinnerComponent, PinnerComponentJson } from './EditablePinnerComponent'

export type EditableComponent = EditablePinnerComponent

export type EditableComponentType = EditableComponent['type'] | 'horizontal-layout' | 'vertical-layout' | 'grid-layout' | 'localization' | 'input'

export type EditableComponentJson = PinnerComponentJson
