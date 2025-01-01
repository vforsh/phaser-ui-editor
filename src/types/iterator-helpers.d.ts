interface Iterator<T, TReturn = any, TNext = undefined> {
	map<U>(mapper: (value: T) => U): Iterator<U>
	filter(predicate: (value: T) => boolean): Iterator<T>
	take(limit: number): Iterator<T>
	drop(limit: number): Iterator<T>
	flatMap<U>(mapper: (value: T) => Iterator<U>): Iterator<U>
	reduce<U>(reducer: (acc: U, value: T) => U, initialValue: U): U
	toArray(): T[]
	forEach(fn: (value: T) => void): void
	some(fn: (value: T) => boolean): boolean
	every(fn: (value: T) => boolean): boolean
	find(fn: (value: T) => boolean): T | undefined
}
