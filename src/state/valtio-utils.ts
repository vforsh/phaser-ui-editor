import { cloneDeep } from 'es-toolkit'
import { unstable_getInternalStates } from 'valtio/vanilla'

const valtioInternals = unstable_getInternalStates()

export function isValtioRef(value: unknown): boolean {
	return typeof value === 'object' && value !== null && valtioInternals.refSet.has(value)
}

export function unproxy<T extends object>(value: T): T {
	return cloneDeep(value)
}
