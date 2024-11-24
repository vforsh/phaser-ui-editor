// import { PhaserAppCommands } from '@/components/Canvas/phaser/PhaserAppCommands'
// import { PhaserAppEvents } from '@/components/Canvas/phaser/PhaserAppEvents'
// import { TypedEventEmitter } from '@/components/Canvas/phaser/robowhale/phaser3/TypedEventEmitter'
// import { getObjectKeys } from '@/components/Canvas/phaser/robowhale/utils/collection/get-object-keys'
// import { CommandEmitter } from '@/components/Canvas/phaser/robowhale/utils/events/CommandEmitter'
import path from 'path-browserify'
import { proxy, subscribe, unstable_getInternalStates, useSnapshot } from 'valtio'
import { z } from 'zod'
import { getObjectKeys } from '../components/Canvas/phaser/robowhale/utils/collection/get-object-keys'
// import { AppCommands } from '../AppCommands'
// import { AppEvents } from '../AppEvents'

const absolutePathSchema = z
	.string()
	.min(1)
	.refine((value) => path.isAbsolute(value), 'must be an absolute path')

const stateSchema = z
	.object({
		lastOpenedProjectDir: absolutePathSchema,
		recentProjects: z.array(
			z.object({
				name: z.string().min(1),
				dir: absolutePathSchema,
				lastOpenedAt: z.number().positive().int(),
			})
		),
		app: z
			.object({
				// events: z.instanceof(TypedEventEmitter<AppEvents>),
				// commands: z.instanceof(CommandEmitter<AppCommands>),
			})
			.required(),
		phaser: z
			.object({
				// events: z.instanceof(TypedEventEmitter<PhaserAppEvents>),
				// commands: z.instanceof(CommandEmitter<PhaserAppCommands>),
			})
			.required(),
	})
	.partial()

type State = z.infer<typeof stateSchema>

// TODO handle parsing & validation errors = just delete the state from localStorage
const initialStateParsed = JSON.parse(localStorage.getItem('state') || '{}')
const initialState = stateSchema.parse(initialStateParsed)

const state = proxy(initialState)

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
