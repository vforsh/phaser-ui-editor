export const MODAL_IDS = ['settings', 'controlRpcCommands'] as const

export type ModalId = (typeof MODAL_IDS)[number]

export const CONTROL_RPC_GROUP_IDS = ['assets', 'objects', 'hierarchy', 'misc', 'debug', 'all'] as const

export type ModalControlRpcGroup = (typeof CONTROL_RPC_GROUP_IDS)[number]
