import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { derive } from 'derive-valtio'
import { merge } from 'es-toolkit'
import { PartialDeep } from 'type-fest'
import { proxy, subscribe, useSnapshot } from 'valtio'
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
	assets: z.array(z.unknown()) as z.ZodType<AssetTreeItemData[]>,
	canvas: z.object({
		hover: z.array(z.string()),
		selection: z.array(z.string()),
		selectionChangedAt: z.number().int().positive().optional(),
		objects: z.unknown().nullable() as z.ZodType<EditableObjectJson | null>,
		objectById: z
			.function()
			.args(z.string())
			.returns(z.unknown() as z.ZodType<EditableObjectJson | undefined>)
			.nullable(),
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
		assets: [],
		canvas: {
			hover: [],
			selection: [],
			objects: null,
			objectById: null,
		},
		app: null,
		phaser: null,
	} satisfies PartialDeep<State>,
	JSON.parse(localStorage.getItem('state') || '{}')
)

// TODO handle errors
const initialState = stateSchema.parse(initialStateParsed)

const state = proxy(initialState)

// save state to localStorage on change, but filter out valtio refs
subscribe(state, () => {
	const serializedState = serializeState()
	localStorage.setItem('state', serializedState)
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

export { derive, state, subscribe, unproxy, useSnapshot }
