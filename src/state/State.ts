import { PartialDeep } from 'type-fest'
import { proxy, subscribe, unstable_getInternalStates, useSnapshot } from 'valtio'
import { z } from 'zod'
import { AppCommands } from '../AppCommands'
import { AppEvents } from '../AppEvents'
import { PhaserAppCommands } from '../components/canvas/phaser/PhaserAppCommands'
import { PhaserAppEvents } from '../components/canvas/phaser/PhaserAppEvents'
import { TypedEventEmitter } from '../components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { CommandEmitter } from '../components/canvas/phaser/robowhale/utils/events/CommandEmitter'
import { projectConfigSchema } from '../project/ProjectConfig'
import { getObjectKeys } from '../utils/collection/get-object-keys'
import { absolutePathSchema } from './Schemas'
const stateSchema = z.object({
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
	project: projectConfigSchema.nullable(),
	app: z
		.object({
			events: z.instanceof(TypedEventEmitter<AppEvents>),
			commands: z.instanceof(CommandEmitter<AppCommands>),
		})
		.required()
		.nullable(),
	phaser: z
		.object({
			events: z.instanceof(TypedEventEmitter<PhaserAppEvents>),
			commands: z.instanceof(CommandEmitter<PhaserAppCommands>),
		})
		.required()
		.nullable(),
})

type State = z.infer<typeof stateSchema>

// state from localStorage, hydrated with default values
const initialStateParsed = Object.assign(
	{},
	{
		recentProjects: [],
		panelDimensions: {
			leftPanelWidth: 400,
			rightPanelWidth: 400,
		},
		project: null,
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

const valtioInternals = unstable_getInternalStates()

function isValtioRef(value: unknown): boolean {
	return typeof value === 'object' && value !== null && valtioInternals.refSet.has(value)
}

export { state, subscribe, useSnapshot, type State }
