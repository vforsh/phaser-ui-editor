import { WritableKeysOf } from 'type-fest'

type ChangeMap<T extends object> = {
	[K in WritableKeysOf<T>]: (value: T[K], prevValue: T[K]) => void
}

export type BaseSectionProps<T extends object> = {
	data: T
	onChange: ChangeMap<T>
}
