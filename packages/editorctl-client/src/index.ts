import type {
	ControlInput as ContractControlInput,
	ControlMeta as ContractControlMeta,
	ControlMetaMethod as ContractControlMetaMethod,
	ControlMethod as ContractControlMethod,
	ControlOutput as ContractControlOutput,
} from '@tekton/control-rpc-contract'

import type { EditorctlClient as ClientType, EditorctlClientOptions as OptionsType } from './client'

import { withEditorPort as fluentWithPort, withEditor as fluentWithEditor } from './call'
import { createEditorctlClient as createClient } from './client'

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
 * Connection options for {@link createEditorctlClient}.
 */
export type EditorctlClientOptions = OptionsType

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
 * @throws Error with `isRpcError` when the request fails at the JSON-RPC layer.
 *
 * @example
 * ```ts
 * import { createEditorctlClient, discoverEditors } from '@tekton/editorctl-client'
 *
 * const [editor] = await discoverEditors()
 * const client = createEditorctlClient({ port: editor.wsPort })
 * ```
 */
export const createEditorctlClient = createClient

/**
 * Creates a one-shot client for a running Tekton Editor using its WebSocket port.
 */
export const withEditorPort = fluentWithPort

/**
 * Creates a one-shot client for a discovered Tekton Editor instance.
 */
export const withEditor = fluentWithEditor

export { TransportError } from './transport/ws'
export { isRpcError, isTransportError } from './errors'
export type { RpcError } from './errors'
export { discoverEditors } from './discovery/discoverEditors'
export type { DiscoverEditorsOptions, DiscoveredEditor } from './discovery/discoverEditors'
export { getErrorLog, getErrorMessage, getErrorName } from './utils/error'
export type { OneShotCallOptions, OneShotClient } from './call'
