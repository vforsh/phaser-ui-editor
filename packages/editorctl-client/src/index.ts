import type {
	ControlInput as ContractControlInput,
	ControlMeta as ContractControlMeta,
	ControlMetaMethod as ContractControlMetaMethod,
	ControlMethod as ContractControlMethod,
	ControlOutput as ContractControlOutput,
} from '@tekton/control-rpc-contract'

import type { EditorctlClient as ClientType, EditorctlClientOptions as OptionsType } from './client'

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
 * @throws Error with `isTransportError` or `isRpcError` when the request fails.
 *
 * @example
 * ```ts
 * import { createEditorctlClient } from '@tekton/editorctl-client'
 *
 * const client = createEditorctlClient({ port: 17870 })
 * const editors = await client.call('listEditors', {})
 * ```
 */
export const createEditorctlClient = createClient
