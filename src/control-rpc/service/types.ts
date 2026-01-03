import type { AppCommandsEmitter } from '../../AppCommands'
import type { ControlApi, ControlMethod } from '../api/ControlApi'

export type EditorControlContext = {
	appCommands: AppCommandsEmitter
}

/**
 * Type definition for a command handler function.
 * Each handler takes an EditorControlContext and returns the handler implementation from ControlApi.
 *
 * @template M - The ControlMethod name that this handler implements
 */
export type CommandHandler<M extends ControlMethod> = (ctx: EditorControlContext) => ControlApi[M]
