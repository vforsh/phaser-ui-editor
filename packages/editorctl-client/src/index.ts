import type {
	ControlInput as ContractControlInput,
	ControlMeta as ContractControlMeta,
	ControlMetaMethod as ContractControlMetaMethod,
	ControlMethod as ContractControlMethod,
	ControlOutput as ContractControlOutput,
} from '@tekton/control-rpc-contract'

import type {
	EditorctlClient as ClientType,
	EditorctlClientOptions as OptionsType,
	GetMetaOptions as GetMetaOptionsType,
	OpenProjectIfNeededResult as OpenProjectIfNeededResultType,
} from './client'

import { createClient as createClientInternal } from './client'

/**
 * Control RPC method names supported by the running Tekton Editor.
 */
export type ControlMethod = ContractControlMethod

/**
 * JSON input payload for a specific control RPC method.
 */
export type ControlInput<M extends ControlMethod> = ContractControlInput<M>

/**
 * JSON output payload for a specific control RPC method.
 */
export type ControlOutput<M extends ControlMethod> = ContractControlOutput<M>

/**
 * Discovery metadata returned by `getControlMeta`.
 */
export type ControlMeta = ContractControlMeta

/**
 * Per-method discovery metadata entry returned by `getControlMeta`.
 */
export type ControlMetaMethod = ContractControlMetaMethod

/**
 * Connection options for {@link createClient}.
 */
export type EditorctlClientOptions = OptionsType

/**
 * Metadata options for `getMeta`.
 */
export type GetMetaOptions = GetMetaOptionsType

/**
 * Result of `openProjectIfNeeded`.
 */
export type OpenProjectIfNeededResult = OpenProjectIfNeededResultType

/**
 * Typed client interface for the Tekton Editor control RPC.
 */
export type EditorctlClient = ClientType

/**
 * Creates a typed client for the Tekton Editor control RPC.
 *
 * @param options - Connection options such as the control RPC port.
 * @returns A client instance for making RPC calls.
 * @throws TransportError when the transport fails.
 * @throws RpcError when the request fails at the JSON-RPC layer.
 *
 * @example
 * ```ts
 * import { createClient, discoverEditors } from '@tekton/editorctl-client'
 *
 * const [editor] = await discoverEditors()
 * const client = createClient({ port: editor.wsPort })
 * ```
 */
export const createClient = createClientInternal

export { isTransportError, TransportError } from './transport/TransportError'
export { isRpcError, RpcError } from './rpc/RpcError'
export { discoverEditors } from './discovery/discoverEditors'
export type { DiscoverEditorsOptions, DiscoveredEditor } from './discovery/discoverEditors'
export { pickEditor } from './discovery/pickEditor'
export { PickEditorError } from './discovery/PickEditorError'
export type { PickEditorErrorDetails, PickEditorErrorReason } from './discovery/PickEditorError'
export type { PickEditorOptions, PickEditorPrefer } from './discovery/pickEditor'
export { connect } from './connect'
export type { ConnectOptions, ConnectResult } from './connect'
export { getErrorLog, getErrorMessage, getErrorName } from './utils/error'
