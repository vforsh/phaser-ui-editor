import { notifications } from '@mantine/notifications'
import { state } from '@state/State'
import { match } from 'ts-pattern'

import { CreateGraphicsAtData } from '../../../../../../AppCommands'
import { getAssetById } from '../../../../../../types/assets'
import { AssetTreeItemData } from '../../../../../../types/assets'
import { EditContext } from '../editContext/EditContext'
import { getEditableWorldBounds } from '../editContext/object-bounds'
import { Selection } from '../editContext/Selection'
import { AddComponentResult, MoveComponentResult, RemoveComponentResult } from '../objects/components/base/ComponentsManager'
import { EditableComponentJson, EditableComponentType } from '../objects/components/base/EditableComponent'
import { EditableContainer } from '../objects/EditableContainer'
import { EditableGraphics } from '../objects/EditableGraphics'
import { EditableObject, EditableObjectType, isEditable, isObjectOfType } from '../objects/EditableObject'
import { isPositionLockedForRuntimeObject } from '../objects/editing/editRestrictions'
import { cloneWithNewLocalIds } from '../objects/localId'
import { isInsidePrefabInstance } from '../prefabs/prefabLock'
import { MainSceneComponentOps } from './MainSceneComponentOps'
import { MainSceneFactory } from './MainSceneFactory'
import { MainSceneDeps } from './mainSceneTypes'

/**
 * Coordinates user editing actions in the MainScene edit context.
 * Handles selection, object lifecycle (create/duplicate/delete), hierarchy moves, grouping, and clipboard operations.
 * Also routes component add/remove/reorder actions and records undoable changes via the scene history.
 */
export class MainSceneOps {
	private componentOps: MainSceneComponentOps
	private factory: MainSceneFactory

	constructor(private deps: MainSceneDeps) {
		this.componentOps = new MainSceneComponentOps({
			history: this.deps.history,
			objectsFactory: this.deps.objectsFactory,
			componentsFactory: this.deps.componentsFactory,
		})

		this.factory = new MainSceneFactory({
			textures: this.deps.scene.textures,
			logger: this.deps.logger,
			assetLoader: this.deps.assetLoader,
			objectsFactory: this.deps.objectsFactory,
			prefabDocument: this.deps.prefabDocument,
			getNewObjectName: this.getNewObjectName.bind(this),
		})
	}

	private notifyPrefabLocked(action: string) {
		notifications.show({
			id: 'prefab-locked',
			title: 'Prefab instance locked',
			message: `${action} is disabled inside prefab instances.`,
			color: 'yellow',
			autoClose: 4000,
		})
	}

	private canMutateHierarchy(objects: EditableObject[], action: string): boolean {
		if (objects.some((obj) => isInsidePrefabInstance(obj))) {
			this.notifyPrefabLocked(action)
			return false
		}

		return true
	}

	private canMutateContext(target: EditableObject, action: string): boolean {
		if (isInsidePrefabInstance(target)) {
			this.notifyPrefabLocked(action)
			return false
		}

		return true
	}

	public selectAllInCurrentContext() {
		const context = this.deps.editContexts.current
		if (!context) {
			return
		}

		context.setSelection(context.target.editables)
	}

	public selectObject(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const context = this.deps.editContexts.findParentContext(obj)
		if (!context) {
			return
		}

		this.deps.editContexts.switchTo(context.target)
		context.setSelection([obj])
	}

	public selectObjects(objIds: string[]) {
		const objects = objIds.map((id) => this.deps.objectsFactory.getObjectById(id)).filter((obj): obj is EditableObject => Boolean(obj))
		if (!objects.length) {
			return
		}

		const context = this.deps.editContexts.findParentContext(objects[0])
		if (!context) {
			return
		}

		const objsFromContext = objects.filter((obj) => obj.parentContainer === context.target)

		this.deps.editContexts.switchTo(context.target)
		context.setSelection(objsFromContext)
	}

	public addObjectToSelection(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		if (state.canvas.selection.includes(objId)) {
			return
		}

		if (state.canvas.selection.length === 0) {
			this.selectObject(objId)
			return
		}

		const selectedObj = this.deps.objectsFactory.getObjectById(state.canvas.selection[0])
		if (!selectedObj) {
			return
		}

		if (obj.parentContainer !== selectedObj.parentContainer) {
			return
		}

		const selectionContext = this.deps.editContexts.findParentContext(selectedObj)
		if (!selectionContext) {
			return
		}

		this.deps.editContexts.switchTo(selectionContext.target)
		selectionContext.addToSelection([obj])
	}

	public removeObjectFromSelection(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		if (!state.canvas.selection.includes(objId)) {
			return
		}

		if (state.canvas.selection.length === 0) {
			return
		}

		const selectedObj = this.deps.objectsFactory.getObjectById(state.canvas.selection[0])
		if (!selectedObj) {
			return
		}

		if (obj.parentContainer !== selectedObj.parentContainer) {
			return
		}

		const selectionContext = this.deps.editContexts.findParentContext(selectedObj)
		if (!selectionContext) {
			return
		}

		this.deps.editContexts.switchTo(selectionContext.target)
		selectionContext.removeFromSelection([obj])
	}

	public clearSelection() {
		const context = this.deps.editContexts.current
		if (!context) {
			return
		}

		context.cancelSelection()
	}

	public switchToContext(contextId: string) {
		const container = this.deps.objectsFactory.getObjectById(contextId)
		if (!container || !isObjectOfType(container, 'Container')) {
			return
		}

		this.deps.editContexts.switchTo(container)
	}

	public highlightObject(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const context = this.deps.editContexts.findParentContext(obj)
		if (!context) {
			return
		}

		// TODO hierarchy: highlight object by command from hierarchy panel
		this.deps.logger.info(`highlighting '${obj.name}' (${objId})`)
	}

	public createObject(data: { clickedObjId: string; type: EditableObjectType }): string | undefined {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()
		const clickedObj = this.deps.objectsFactory.getObjectById(data.clickedObjId)
		if (!clickedObj) {
			return
		}

		const editContext = isObjectOfType(clickedObj, 'Container')
			? this.deps.editContexts.getContext(clickedObj)
			: this.deps.editContexts.findParentContext(clickedObj)

		if (!editContext) {
			this.deps.logger.error(`failed to find edit context for '${clickedObj.name}' (${clickedObj.id})`)
			return
		}

		if (!this.canMutateContext(editContext.target, 'Create objects')) {
			return
		}

		const newObj = match(data.type)
			.with('Container', () => this.deps.objectsFactory.container('group'))
			.with('Graphics', () => this.deps.objectsFactory.graphicsRectangle())
			.with('Image', () => null)
			.with('Text', () => null)
			.with('BitmapText', () => null)
			.with('NineSlice', () => null)
			.exhaustive()

		if (!newObj) {
			return
		}

		const newObjName = this.getNewObjectName(editContext, newObj)
		newObj.setName(newObjName)

		this.deps.editContexts.switchTo(editContext.target)
		editContext.target.add(newObj)
		editContext.setSelection([newObj])

		if (before) {
			void this.deps.history.push('Create object', before, this.deps.history.captureSnapshot())
		}

		return newObj.id
	}

	public createGraphicsAt(data: CreateGraphicsAtData): string | undefined {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()
		const parentObj = this.deps.objectsFactory.getObjectById(data.parentId)
		if (!parentObj) {
			return
		}

		const editContext = isObjectOfType(parentObj, 'Container')
			? this.deps.editContexts.getContext(parentObj)
			: this.deps.editContexts.findParentContext(parentObj)

		if (!editContext) {
			return
		}

		if (!this.canMutateContext(editContext.target, 'Create objects')) {
			return
		}

		if (editContext.target === this.deps.getSuperRoot()) {
			return
		}

		const world = this.deps.scene.cameras.main.getWorldPoint(data.canvasPos.x, data.canvasPos.y)
		const newObj =
			data.shape === 'rectangle' ? this.deps.objectsFactory.graphicsRectangle() : this.deps.objectsFactory.graphicsEllipse()

		newObj.setPosition(world.x, world.y)

		const newObjName = this.getNewObjectName(editContext, newObj)
		newObj.setName(newObjName)

		this.deps.editContexts.switchTo(editContext.target)
		editContext.target.add(newObj)
		editContext.setSelection([newObj])

		if (before) {
			void this.deps.history.push('Create graphics', before, this.deps.history.captureSnapshot())
		}

		return newObj.id
	}

	public copyObject(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.deps.logger.info(`copying '${obj.name}' (${objId})`)
	}

	public duplicateObject(objId: string) {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		if (!this.canMutateHierarchy([obj], 'Duplicate')) {
			return
		}

		const editContext = this.deps.editContexts.findParentContext(obj)
		if (!editContext) {
			this.deps.logger.error(`failed to find edit context for '${obj.name}' (${objId})`)
			return
		}

		const objJson = obj.toJson()

		const newObjName = this.getNewObjectName(editContext, obj)
		const newObj = this.deps.objectsFactory.fromJson(cloneWithNewLocalIds(objJson))
		newObj.setName(newObjName)
		newObj.setPosition(obj.x + 30, obj.y + 30)

		this.deps.editContexts.switchTo(editContext.target)
		editContext.target.add(newObj)
		editContext.setSelection([newObj])

		if (before) {
			void this.deps.history.push('Duplicate object', before, this.deps.history.captureSnapshot())
		}
	}

	public cutObject(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.deps.logger.info(`cutting '${obj.name}' (${objId})`)
	}

	public pasteObject(objId: string) {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		// TODO implement
		this.deps.logger.info(`pasting '${obj.name}' (${objId})`)
	}

	public deleteObjects(objIds: string[]) {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()
		const objs = objIds
			.map((objId) => this.deps.objectsFactory.getObjectById(objId))
			.filter((obj): obj is EditableObject => Boolean(obj))

		if (!this.canMutateHierarchy(objs, 'Delete')) {
			return
		}

		let somethingDeleted = false
		for (const objId of objIds) {
			const obj = this.deps.objectsFactory.getObjectById(objId)
			if (obj) {
				if (obj === this.deps.getRoot()) {
					this.deps.logger.warn(`can't delete root object!`)
					continue
				}
				obj.destroy()
				somethingDeleted = true
			}
		}

		if (before && somethingDeleted) {
			void this.deps.history.push('Delete objects', before, this.deps.history.captureSnapshot())
		}
	}

	public moveObjectInHierarchy(objId: string, newParentId: string, newParentIndex: number) {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()
		if (objId === newParentId) {
			this.deps.logger.warn(`can't move object to itself`)
			return
		}

		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return
		}

		const newParent = this.deps.objectsFactory.getObjectById(newParentId)
		if (!newParent || !isObjectOfType(newParent, 'Container')) {
			return
		}

		if (!this.canMutateHierarchy([obj, newParent], 'Move')) {
			return
		}

		// check if new parent is NOT an ancestor of the object
		if (isObjectOfType(obj, 'Container')) {
			const parentsIds = this.calculateObjectParentsChain(newParent)
			if (parentsIds.includes(objId)) {
				this.deps.logger.warn(`can't move '${obj.name}' (${objId}) to its ancestor '${newParent.name}' (${newParentId})`)
				return
			}
		}

		this.deps.logger.info(`moving '${obj.name}' (${objId}) to index ${newParentIndex} in '${newParent.name}' (${newParentId})`)

		if (obj.parentContainer === newParent) {
			const currentIndex = obj.parentContainer.getIndex(obj)
			const newAdjustedIndex = currentIndex < newParentIndex ? newParentIndex - 1 : newParentIndex
			newParent.moveTo(obj, newAdjustedIndex)
		} else {
			newParent.addAt(obj, newParentIndex)
		}

		if (before) {
			void this.deps.history.push('Move in hierarchy', before, this.deps.history.captureSnapshot())
		}
	}

	public getObjectPath(objId: string): string {
		const obj = this.deps.objectsFactory.getObjectById(objId)
		if (!obj) {
			return ''
		}

		const parentNames = this.calculateObjectParentsChain(obj).map((id) => {
			return this.deps.objectsFactory.getObjectById(id)!.name
		})

		const pathParts = [obj.name].concat(parentNames).reverse()

		return pathParts.join('/')
	}

	public calculateObjectParentsChain(obj: EditableObject): string[] {
		const parents: string[] = []
		let current = obj.parentContainer
		while (current && isEditable(current) && current !== this.deps.getSuperRoot()) {
			parents.unshift(current.id)
			current = current.parentContainer
		}
		return parents
	}

	public getNewObjectName(context: EditContext, objToName: EditableObject, prefix?: string): string {
		const base = prefix ?? this.createNamePrefix(objToName)
		const forceNumberSuffix = this.shouldForceNumberSuffix(objToName)

		let n = 1
		let name = forceNumberSuffix ? `${base}_${n}` : `${base}`
		while (context.target.editables.some((item) => item.name === name)) {
			n += 1
			name = `${base}_${n}`
		}

		return name
	}

	private createNamePrefix(obj: EditableObject): string {
		if (!obj.name) {
			return match(obj)
				.with({ kind: 'Container' }, () => 'group')
				.with({ kind: 'Graphics' }, (obj) => this.getGraphicsNamePrefix(obj))
				.otherwise((obj) => {
					return obj.asset.name.split('.').slice(0, -1).join('.')
				})
		}

		return obj.name.replace(/_\d+$/, '')
	}

	private getGraphicsNamePrefix(obj: EditableGraphics): string {
		const shapeType = obj.getShapeType()
		const suffix = shapeType === 'rectangle' ? 'rect' : shapeType
		return `graphics_${suffix}`
	}

	private shouldForceNumberSuffix(obj: EditableObject): boolean {
		return obj.kind === 'Graphics'
	}

	public resetImageOriginalSize(data: { objectId: string }) {
		const obj = this.deps.objectsFactory.getObjectById(data.objectId)
		if (!obj || obj.kind !== 'Image') {
			return
		}

		const assets = state.assets.items
		const asset = getAssetById(assets, obj.asset.id)
		if (!asset || (asset.type !== 'image' && asset.type !== 'spritesheet-frame')) {
			return
		}

		const size = asset.size
		if (!size || size.w === 0 || size.h === 0) {
			return
		}

		void this.deps.history.withUndo('Reset image original size', () => {
			obj.setDisplaySize(size.w, size.h)
			obj.setScale(1)
		})
	}

	public adjustContainerToChildrenBounds(data: { objectId: string }) {
		const obj = this.deps.objectsFactory.getObjectById(data.objectId)
		if (!obj || !isObjectOfType(obj, 'Container')) {
			return
		}

		const container = obj
		const children = container.editables
		if (children.length === 0) {
			return
		}

		const containerWorldMatrix = container.getWorldTransformMatrix()
		const tempVec = new Phaser.Math.Vector2()

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		children.forEach((child) => {
			const bounds = getEditableWorldBounds(child)
			const left = bounds.left
			const right = bounds.right
			const top = bounds.top
			const bottom = bounds.bottom

			const corners = [
				[left, top],
				[right, top],
				[right, bottom],
				[left, bottom],
			]

			corners.forEach(([x, y]) => {
				const local = containerWorldMatrix.applyInverse(x, y, tempVec)
				minX = Math.min(minX, local.x)
				minY = Math.min(minY, local.y)
				maxX = Math.max(maxX, local.x)
				maxY = Math.max(maxY, local.y)
			})
		})

		if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
			return
		}

		const width = Math.max(0, maxX - minX)
		const height = Math.max(0, maxY - minY)
		const centerLocalX = (minX + maxX) * 0.5
		const centerLocalY = (minY + maxY) * 0.5
		const cos = Math.cos(container.rotation)
		const sin = Math.sin(container.rotation)
		const scaledX = centerLocalX * container.scaleX
		const scaledY = centerLocalY * container.scaleY
		const offsetX = scaledX * cos - scaledY * sin
		const offsetY = scaledX * sin + scaledY * cos

		if (isPositionLockedForRuntimeObject(container)) {
			return
		}

		if (children.some((child) => isPositionLockedForRuntimeObject(child))) {
			return
		}

		void this.deps.history.withUndo('Adjust container to children bounds', () => {
			container.setPosition(container.x + offsetX, container.y + offsetY)
			children.forEach((child) => {
				child.setPosition(child.x - centerLocalX, child.y - centerLocalY)
			})
			container.setSize(width, height)

			const selection = this.deps.editContexts.current?.selection
			if (selection && selection.objects.includes(container)) {
				selection.updateBounds()
			}
		})
	}

	public async handleAssetDrop(data: { asset: AssetTreeItemData; position: { x: number; y: number } }) {
		const before = this.deps.history.isRestoring ? null : this.deps.history.captureSnapshot()

		// adding objects to super root is not allowed
		if (this.deps.editContexts.current?.target === this.deps.getSuperRoot()) {
			this.deps.logger.warn(`adding objects to super root is not allowed`)
			return null
		}

		const obj = await this.createObjectFromAsset(data.asset)
		if (!obj) {
			return null
		}

		const editContext = this.deps.editContexts.current!
		if (!this.canMutateContext(editContext.target, 'Create objects')) {
			return null
		}
		const worldPos = this.deps.scene.cameras.main.getWorldPoint(data.position.x, data.position.y)
		const localPos = new Phaser.Math.Vector2()
		editContext.target.pointToContainer(worldPos, localPos)

		obj.setPosition(localPos.x, localPos.y)
		editContext.target.add(obj)

		editContext.setSelection([obj])

		if (before) {
			void this.deps.history.push('Create from asset', before, this.deps.history.captureSnapshot())
		}

		return obj
	}

	public async createObjectFromAsset(asset: AssetTreeItemData) {
		const context = this.deps.editContexts.current
		if (!context) {
			return null
		}

		return await this.factory.createObjectFromAsset(asset, context)
	}

	public addComponent(data: { componentType: EditableComponentType; objectId: string }): AddComponentResult {
		return this.componentOps.addComponent(data)
	}

	public removeComponent(data: { componentType: EditableComponentType; objectId: string }): RemoveComponentResult {
		return this.componentOps.removeComponent(data)
	}

	public moveComponentUp(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		return this.componentOps.moveComponentUp(data)
	}

	public moveComponentDown(data: { componentType: EditableComponentType; objectId: string }): MoveComponentResult {
		return this.componentOps.moveComponentDown(data)
	}

	public pasteComponent(data: { componentData: EditableComponentJson; objectId: string }): AddComponentResult {
		return this.componentOps.pasteComponent(data)
	}

	public groupSelection() {
		const editContext = this.deps.editContexts.current!
		if (!editContext) {
			return
		}

		const selection = editContext.selection
		if (!selection || selection.isEmpty) {
			return
		}

		if (!this.canMutateHierarchy(selection.objects, 'Group')) {
			return
		}

		return this.deps.history.withUndo('Group', () => {
			const name = this.getNewObjectName(editContext, selection.objects[0])
			const bounds = selection.objects.length === 1 ? this.deps.aligner.getRotatedBounds(selection.objects[0]) : selection.bounds
			const group = this.deps.objectsFactory.container(name)
			group.setPosition(bounds.centerX, bounds.centerY)
			group.setSize(bounds.width, bounds.height)
			editContext.target.add(group)

			this.deps.logger.debug(`grouped ${selection.objectsAsString} -> '${group.name}'`)

			selection.objects.forEach((obj) => {
				group.add(obj)
				obj.x -= group.x
				obj.y -= group.y
			})
			selection.destroy()

			editContext.selection = editContext.createSelection([group])
			editContext.transformControls.startFollow(editContext.selection)

			return group
		})
	}

	public ungroupSelection() {
		const editContext = this.deps.editContexts.current!
		if (!editContext) {
			return
		}

		const selection = editContext.selection
		if (!selection || selection.isEmpty) {
			return
		}

		const groups = selection.objects.filter((obj) => obj instanceof EditableContainer)
		if (groups.length === 0) {
			return
		}

		if (!this.canMutateHierarchy(groups, 'Ungroup')) {
			return
		}

		return this.deps.history.withUndo('Ungroup', () => {
			const ungrouped = groups.flatMap((group) => {
				const sin = Math.sin(group.rotation)
				const cos = Math.cos(group.rotation)

				group.components.deactivateAll()

				const ungrouped = group.editables.map((child) => {
					// Calculate new position accounting for group angle and scale
					const dx = child.x * group.scaleX
					const dy = child.y * group.scaleY
					const rotatedX = dx * cos - dy * sin
					const rotatedY = dx * sin + dy * cos

					child.x = group.x + rotatedX
					child.y = group.y + rotatedY
					child.angle += group.angle
					child.scaleX *= group.scaleX
					child.scaleY *= group.scaleY
					editContext.target.add(child)
					return child
				})

				group.destroy()

				this.deps.logger.debug(
					`ungrouped '${group.name}' -> [${ungrouped.map((obj) => obj.name || 'item').join(', ')}] (${ungrouped.length})`,
				)

				return ungrouped
			})

			editContext.selection = editContext.createSelection(ungrouped)
			editContext.transformControls.startFollow(editContext.selection)

			return ungrouped
		})
	}

	public copySelection() {
		const selection = this.deps.editContexts.current?.selection
		if (!selection) {
			return
		}

		this.deps.clipboard.copy(selection.objects)
	}

	public cutSelection() {
		return this.deps.history.withUndo('Cut', () => {
			this.copySelection()
			this.removeSelection()
		})
	}

	public paste() {
		const editContext = this.deps.editContexts.current!
		if (!editContext) {
			return
		}

		if (!this.canMutateContext(editContext.target, 'Paste')) {
			return
		}

		// pasting on super root is not allowed
		if (editContext.target === this.deps.getSuperRoot()) {
			this.deps.logger.warn(`adding objects to super root is not allowed`)
			return
		}

		return this.deps.history.withUndo('Paste', () => {
			const copiedObjs = this.deps.clipboard.paste()
			if (!copiedObjs) {
				return
			}

			copiedObjs.forEach((obj) => {
				const name = this.getNewObjectName(editContext, obj)
				obj.setName(name)
				obj.setPosition(obj.x + 30, obj.y + 30)
				editContext.target.add(obj)
				this.deps.logger.debug(`pasted '${name}'`)
			})

			editContext.selection?.destroy()
			editContext.selection = editContext.createSelection(copiedObjs)
			editContext.transformControls.startFollow(editContext.selection)
		})
	}

	public removeSelection() {
		const selection = this.deps.editContexts.current?.selection
		if (!selection) {
			return
		}

		if (!this.canMutateHierarchy(selection.objects, 'Delete')) {
			return
		}

		return this.deps.history.withUndo('Delete objects', () => {
			selection.objects.slice(0).forEach((obj) => {
				obj.parentContainer.remove(obj, true)
			})
		})
	}

	public moveSelection(dx: number, dy: number, shiftKey = false) {
		const selected = this.deps.editContexts.current?.selection
		if (!selected) {
			return
		}

		return this.deps.history.withUndo('Move', () => {
			selected.move(dx * (shiftKey ? 10 : 1), dy * (shiftKey ? 10 : 1))
		})
	}

	public moveSelectionDownInHierarchy(toBottom = false) {
		const selected = this.deps.editContexts.current?.selection
		if (!selected) {
			return
		}

		if (!this.canMutateHierarchy(selected.objects, 'Reorder')) {
			return
		}

		return this.deps.history.withUndo('Move down in hierarchy', () => {
			selected.objects.forEach((obj) => {
				if (toBottom) {
					obj.parentContainer.sendToBack(obj)
				} else {
					obj.parentContainer.moveDown(obj)
				}
			})
		})
	}

	public moveSelectionUpInHierarchy(toTop = false) {
		const selected = this.deps.editContexts.current?.selection
		if (!selected) {
			return
		}

		if (!this.canMutateHierarchy(selected.objects, 'Reorder')) {
			return
		}

		return this.deps.history.withUndo('Move up in hierarchy', () => {
			selected.objects.forEach((obj) => {
				if (toTop) {
					obj.parentContainer.bringToTop(obj)
				} else {
					obj.parentContainer.moveUp(obj)
				}
			})
		})
	}

	public resetSelectionTransform() {
		const selection = this.deps.editContexts.current?.selection
		if (!selection) {
			return
		}

		return this.deps.history.withUndo('Reset transform', () => {
			selection.objects.forEach((obj) => {
				obj.setRotation(0)
				obj.setScale(1)
			})

			selection.updateBounds()
		})
	}

	public renameObject(data: { objectId: string; name: string }): void {
		const obj = this.deps.objectsFactory.getObjectById(data.objectId)
		if (!obj) {
			return
		}

		if (!this.canMutateHierarchy([obj], 'Rename')) {
			return
		}

		const trimmedName = data.name.trim()
		if (trimmedName.length === 0) {
			return
		}

		if (obj.name === trimmedName) {
			return
		}

		this.deps.history.withUndo('Rename object', () => {
			obj.setName(trimmedName)
		})
	}
}
