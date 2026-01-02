import { EditableComponentType } from '../components/base/EditableComponent'
import { EditableContainerJson } from '../EditableContainer'
import { EditableObject, EditableObjectJson } from '../EditableObject'

export type EditableProperty = 'position' | 'size' | 'scale' | 'rotation' | 'origin'

export interface EditLock {
	property: EditableProperty
	reason: string
	source?: {
		type: EditableComponentType
		id?: string
	}
}

export type RestrictionContext = {
	object: EditableObjectJson
	parent?: EditableContainerJson
}

export type ComponentEditRestrictionContributor = {
	getSelfRestrictions?: (ctx: RestrictionContext) => EditLock[]
	getChildRestrictions?: (ctx: RestrictionContext) => EditLock[]
}

const contributors: Partial<Record<EditableComponentType, ComponentEditRestrictionContributor>> = {}

export function registerComponentEditRestriction(
	type: EditableComponentType,
	contributor: ComponentEditRestrictionContributor
) {
	contributors[type] = contributor
}

// Register v1 contributors
registerComponentEditRestriction('layout', {
	getSelfRestrictions: () => [
		{
			property: 'position',
			reason: 'Position is controlled by Layout component',
			source: { type: 'layout' },
		},
	],
})

const parentLayoutContributor: ComponentEditRestrictionContributor = {
	getChildRestrictions: (ctx) => {
		const parentComp = ctx.parent?.components.find(
			(c) =>
				c.active && (c.type === 'horizontal-layout' || c.type === 'vertical-layout' || c.type === 'grid-layout')
		)

		if (!parentComp) return []

		const friendlyName = {
			'horizontal-layout': 'Horizontal Layout',
			'vertical-layout': 'Vertical Layout',
			'grid-layout': 'Grid Layout',
		}[parentComp.type as 'horizontal-layout' | 'vertical-layout' | 'grid-layout']

		return [
			{
				property: 'position',
				reason: `Position is controlled by parent's ${friendlyName} component`,
				source: {
					type: parentComp.type as EditableComponentType,
					id: parentComp.id,
				},
			},
		]
	},
}

registerComponentEditRestriction('horizontal-layout', parentLayoutContributor)
registerComponentEditRestriction('vertical-layout', parentLayoutContributor)
registerComponentEditRestriction('grid-layout', parentLayoutContributor)

// Size restrictions
const sizeLockContributor: ComponentEditRestrictionContributor = {
	getSelfRestrictions: (ctx) => [
		{
			property: 'size',
			reason: `Size is controlled by ${ctx.object.components.find((c) => c.active && (c.type === 'horizontal-layout' || c.type === 'vertical-layout' || c.type === 'grid-layout'))?.type === 'horizontal-layout' ? 'Horizontal Layout' : ctx.object.components.find((c) => c.active && (c.type === 'horizontal-layout' || c.type === 'vertical-layout' || c.type === 'grid-layout'))?.type === 'vertical-layout' ? 'Vertical Layout' : 'Grid Layout'} component`,
			source: {
				type: ctx.object.components.find(
					(c) =>
						c.active &&
						(c.type === 'horizontal-layout' || c.type === 'vertical-layout' || c.type === 'grid-layout')
				)?.type as EditableComponentType,
				id: ctx.object.components.find(
					(c) =>
						c.active &&
						(c.type === 'horizontal-layout' || c.type === 'vertical-layout' || c.type === 'grid-layout')
				)?.id,
			},
		},
	],
}

registerComponentEditRestriction('horizontal-layout', { ...parentLayoutContributor, ...sizeLockContributor })
registerComponentEditRestriction('vertical-layout', { ...parentLayoutContributor, ...sizeLockContributor })
registerComponentEditRestriction('grid-layout', { ...parentLayoutContributor, ...sizeLockContributor })

export function getEditLocksForObjectJson(object: EditableObjectJson, parent?: EditableContainerJson): EditLock[] {
	const locks: EditLock[] = []

	// 1. Self restrictions (from components on the object itself)
	for (const comp of object.components) {
		const contributor = contributors[comp.type]
		if (contributor?.getSelfRestrictions && comp.active) {
			locks.push(...contributor.getSelfRestrictions({ object, parent }))
		}
	}

	// 2. Parent restrictions (from components on the parent)
	if (parent) {
		for (const comp of parent.components) {
			const contributor = contributors[comp.type]
			if (contributor?.getChildRestrictions && comp.active) {
				locks.push(...contributor.getChildRestrictions({ object, parent }))
			}
		}
	}

	return locks
}

export function getEditLocksForRuntimeObject(obj: EditableObject): EditLock[] {
	const objectJson = obj.toJson()
	const parent = obj.parentContainer
	const parentJson = parent && 'toJson' in parent ? (parent as any).toJson() : undefined

	return getEditLocksForObjectJson(objectJson, parentJson)
}

export function isPositionLockedForObjectJson(
	object: EditableObjectJson,
	parent?: EditableContainerJson
): EditLock | undefined {
	return getEditLocksForObjectJson(object, parent).find((lock) => lock.property === 'position')
}

export function isPositionLockedForRuntimeObject(obj: EditableObject): EditLock | undefined {
	return getEditLocksForRuntimeObject(obj).find((lock) => lock.property === 'position')
}

export function isSizeLockedForObjectJson(
	object: EditableObjectJson,
	parent?: EditableContainerJson
): EditLock | undefined {
	return getEditLocksForObjectJson(object, parent).find((lock) => lock.property === 'size')
}

export function isSizeLockedForRuntimeObject(obj: EditableObject): EditLock | undefined {
	return getEditLocksForRuntimeObject(obj).find((lock) => lock.property === 'size')
}

export function trySetPositionUser(obj: EditableObject, x: number, y: number): boolean {
	if (isPositionLockedForRuntimeObject(obj)) {
		return false
	}
	obj.setPosition(x, y)
	return true
}

export function trySetXUser(obj: EditableObject, x: number): boolean {
	if (isPositionLockedForRuntimeObject(obj)) {
		return false
	}
	obj.setX(x)
	return true
}

export function trySetYUser(obj: EditableObject, y: number): boolean {
	if (isPositionLockedForRuntimeObject(obj)) {
		return false
	}
	obj.setY(y)
	return true
}
