import { Command } from 'commander'
import { Ctx } from '../lib/context'
import * as deleteObjects from './deleteObjects'
import * as getAssetInfo from './getAssetInfo'
import * as getProjectInfo from './getProjectInfo'
import * as listHierarchy from './listHierarchy'
import * as listAssets from './listAssets'
import * as listEditors from './listEditors'
import * as openPrefab from './openPrefab'
import * as openProject from './openProject'
import * as selectObject from './selectObject'
import * as switchToContext from './switchToContext'

export function registerAllCommands(program: Command, ctx: Ctx) {
	deleteObjects.register(program, ctx)
	getAssetInfo.register(program, ctx)
	getProjectInfo.register(program, ctx)
	listHierarchy.register(program, ctx)
	listAssets.register(program, ctx)
	listEditors.register(program, ctx)
	openPrefab.register(program, ctx)
	openProject.register(program, ctx)
	selectObject.register(program, ctx)
	switchToContext.register(program, ctx)
}
