import { WritableKeysOf } from 'type-fest'
import { ChangeCallback } from '../InspectorSection'

export type BaseSectionProps<T extends object> = {
	data: T
	onChange: ChangeCallback<T, WritableKeysOf<T>>
}
