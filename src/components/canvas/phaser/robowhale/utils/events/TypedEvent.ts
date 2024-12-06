export type TypedEventMap = { [event: string]: (...args: any[]) => any }

export type TypedEvent<TMap extends TypedEventMap> = Exclude<keyof TMap, number | symbol>

// eslint-disable-next-line
export type EmptyEvents = {}
