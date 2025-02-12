import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { derive } from 'derive-valtio'
import { debounce, merge } from 'es-toolkit'
import { PartialDeep } from 'type-fest'
import { proxy, subscribe as subscribeValtio, useSnapshot } from 'valtio'
import { z } from 'zod'
import { AppCommands } from '../AppCommands'
import { AppEvents } from '../AppEvents'
import { PhaserAppCommands } from '../components/canvas/phaser/PhaserAppCommands'
import { PhaserAppEvents } from '../components/canvas/phaser/PhaserAppEvents'
import { TypedEventEmitter } from '../components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from '../components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { projectConfigSchema } from '../project/ProjectConfig'
import { AssetTreeItemData } from '../types/assets'
import { getObjectKeys } from '../utils/collection/get-object-keys'
import { absolutePathSchema } from './Schemas'
import { isValtioRef, unproxy } from './valtio-utils'

export const stateSchema = z.object({
	lastOpenedProjectDir: absolutePathSchema.optional(),
	recentProjects: z.array(
		z.object({
			name: z.string().min(1),
			dir: absolutePathSchema,
			lastOpenedAt: z.number().positive().int(),
		})
	),
	panelDimensions: z.object({
		leftPanelWidth: z.number().int().positive(),
		rightPanelWidth: z.number().int().positive(),
		hierarchyHeight: z.number().int().positive().optional(),
	}),
	projectDir: absolutePathSchema.nullable(),
	project: projectConfigSchema.nullable(),
	assets: z.object({
		selection: z.array(z.string()),
		selectionChangedAt: z.number().int().positive().optional(),
		items: z.array(z.unknown()) as z.ZodType<AssetTreeItemData[]>,
		searchHistory: z.array(z.string()).default([]),
		locateAsset: z.function().args(z.string()).optional(),
	}),
	canvas: z.object({
		hasUnsavedChanges: z.boolean().default(false),
		lastOpenedPrefabAssetId: z.string().optional(),
		camera: z.object({
			zoom: z.number().positive(),
			scrollX: z.number(),
			scrollY: z.number(),
		}),
		hover: z.array(z.string()),
		selection: z.array(z.string()),
		selectionChangedAt: z.number().int().positive().optional(),
		objects: z.unknown().nullable() as z.ZodType<EditableObjectJson | null>,
		objectById: z
			.function()
			.args(z.string())
			.returns(z.unknown() as z.ZodType<EditableObjectJson | undefined>),
	}),
	inspector: z.object({
		componentsClipboard: z.array(z.string()),
	}),
	// TODO move it out of state
	app: z
		.object({
			events: z.instanceof(TypedEventEmitter<AppEvents>),
			commands: z.instanceof(CommandEmitter<AppCommands>),
		})
		.required()
		.nullable(),
	// TODO move it out of state
	phaser: z
		.object({
			events: z.instanceof(TypedEventEmitter<PhaserAppEvents>),
			commands: z.instanceof(CommandEmitter<PhaserAppCommands>),
		})
		.required()
		.nullable(),
})

export type State = z.infer<typeof stateSchema>

// state from localStorage, hydrated with default values
const initialStateParsed = merge(
	// {},
	{
		recentProjects: [],
		panelDimensions: {
			leftPanelWidth: 400,
			rightPanelWidth: 400,
		},
		projectDir: null,
		project: null,
		assets: {
			selection: [],
			items: [],
			searchHistory: [],
		},
		canvas: {
			hasUnsavedChanges: false,
			camera: {
				zoom: 1,
				scrollX: 0,
				scrollY: 0,
			},
			hover: [],
			selection: [],
			objects: null,
			objectById: () => undefined,
		},
		inspector: {
			componentsClipboard: [],
		},
		app: null,
		phaser: null,
	} satisfies PartialDeep<State>,
	// @ts-expect-error
	JSON.parse(localStorage.getItem('state') || '{}')
)

// TODO handle errors
const initialState = stateSchema.parse(initialStateParsed)

const state = proxy(initialState)

const debouncedSaveState = debounce(() => {
	const serializedState = serializeState()
	localStorage.setItem('state', serializedState)
}, 1000)

window.addEventListener('beforeunload', () => {
	debouncedSaveState.flush()
})

// save state to localStorage on change, but filter out valtio refs
subscribeValtio(state, () => {
	debouncedSaveState()
})

function serializeState(): string {
	const stateCopy = { ...state }

	getObjectKeys(stateCopy).forEach((key) => {
		if (isValtioRef(stateCopy[key])) {
			delete stateCopy[key]
		}
	})

	return JSON.stringify(stateCopy)
}

// expose valtio types
type Path = (string | symbol)[]
type Op = [op: 'set', path: Path, value: unknown, prevValue: unknown] | [op: 'delete', path: Path, prevValue: unknown]

/**
 * Subscribe to changes of a proxy object.
 *
 * @param proxyObject - The proxy object to subscribe to.
 * @param callback - The callback to call when the proxy object changes.
 * @param options - The options for the subscription.
 * @param options.signal - The signal to abort the subscription.
 * @returns A function to unsubscribe from the subscription.
 */
const subscribe = (
	proxyObject: object,
	callback: (unstable_ops: Op[]) => void,
	options: { notifyInSync?: boolean; signal?: AbortSignal } = {}
): (() => void) => {
	const unsub = subscribeValtio(proxyObject, callback, options.notifyInSync)

	if (options.signal) {
		options.signal.addEventListener('abort', unsub, { once: true })
	}

	return unsub
}

export { derive, state, subscribe, unproxy, useSnapshot }
