import { isSettingsSectionId, type SettingsSectionId } from '../settings/EditorSettings'

export const MODAL_IDS = ['settings', 'controlRpcCommands'] as const

export type ModalId = (typeof MODAL_IDS)[number]

export const CONTROL_RPC_GROUP_IDS = ['assets', 'objects', 'hierarchy', 'misc', 'debug', 'all'] as const

export type ModalControlRpcGroup = (typeof CONTROL_RPC_GROUP_IDS)[number]

export type ModalParamsById = {
	settings: {
		sectionId: SettingsSectionId
	}
	controlRpcCommands: {
		group: ModalControlRpcGroup
	}
}

export type ModalListItem = {
	id: ModalId
	isOpen: boolean
}

export type ModalListResult = {
	activeModalId: ModalId | null
	modals: ModalListItem[]
}

export type ModalStateSummary = {
	activeModalId: ModalId | null
}

const defaultParams: ModalParamsById = {
	settings: { sectionId: 'general' },
	controlRpcCommands: { group: 'assets' },
}

const modalIdSet = new Set<string>(MODAL_IDS)
const controlRpcGroupSet = new Set<string>(CONTROL_RPC_GROUP_IDS)

export function isModalId(value: unknown): value is ModalId {
	return typeof value === 'string' && modalIdSet.has(value)
}

export function isControlRpcGroup(value: unknown): value is ModalControlRpcGroup {
	return typeof value === 'string' && controlRpcGroupSet.has(value)
}

export function getDefaultModalParams<T extends ModalId>(id: T): ModalParamsById[T] {
	return defaultParams[id]
}

export function areModalParamsEqual<T extends ModalId>(id: T, a: ModalParamsById[T], b: ModalParamsById[T]): boolean {
	switch (id) {
		case 'settings':
			return (a as ModalParamsById['settings']).sectionId === (b as ModalParamsById['settings']).sectionId
		case 'controlRpcCommands':
			return (a as ModalParamsById['controlRpcCommands']).group === (b as ModalParamsById['controlRpcCommands']).group
		default: {
			const exhaustive: never = id
			return exhaustive
		}
	}
}

export function normalizeModalParams<T extends ModalId>(id: T, params: unknown): ModalParamsById[T] {
	if (id === 'settings') {
		if (params && typeof params === 'object' && 'sectionId' in params) {
			const sectionId = (params as { sectionId?: unknown }).sectionId
			if (typeof sectionId === 'string' && isSettingsSectionId(sectionId)) {
				return { sectionId } as ModalParamsById[T]
			}
		}

		return defaultParams.settings as ModalParamsById[T]
	}

	if (id === 'controlRpcCommands') {
		if (params && typeof params === 'object' && 'group' in params) {
			const group = (params as { group?: unknown }).group
			if (isControlRpcGroup(group)) {
				return { group } as ModalParamsById[T]
			}
		}

		return defaultParams.controlRpcCommands as ModalParamsById[T]
	}

	return defaultParams[id]
}
