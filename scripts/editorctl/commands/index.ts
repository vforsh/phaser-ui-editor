import { Command } from 'commander'
import { Ctx } from '../lib/context'
import * as deleteObject from './delete-object'
import * as hierarchy from './hierarchy'
import * as openPrefab from './open-prefab'
import * as openProject from './open-project'
import * as selectObject from './select-object'
import * as switchContext from './switch-context'

export function registerAllCommands(program: Command, ctx: Ctx) {
	deleteObject.register(program, ctx)
	hierarchy.register(program, ctx)
	openPrefab.register(program, ctx)
	openProject.register(program, ctx)
	selectObject.register(program, ctx)
	switchContext.register(program, ctx)
}
