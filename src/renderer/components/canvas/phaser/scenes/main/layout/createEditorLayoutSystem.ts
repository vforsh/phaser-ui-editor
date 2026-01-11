import type { ILogObj, Logger } from 'tslog'

import { LayoutSystem } from '@tekton/runtime'

import type { MainScene } from '../MainScene'
import type { EditableObject } from '../objects/EditableObject'
import type { EditableObjectsFactory } from '../objects/EditableObjectsFactory'

import { LayoutComponent } from '../objects/components/LayoutComponent'
import { EditableContainer } from '../objects/EditableContainer'

export type EditorLayoutSystemOptions = {
	scene: MainScene
	objectsFactory: EditableObjectsFactory
	logger: Logger<ILogObj>
}

export function createEditorLayoutSystem(options: EditorLayoutSystemOptions): LayoutSystem<EditableContainer, EditableObject> {
	const layoutSystem = new LayoutSystem<EditableContainer, EditableObject>({
		scheduleFlush: (flush) => {
			options.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, flush)
		},
		isAlive: (container) => Boolean(container.scene),
		getChildren: (container) => container.editables,
		getLayoutApplier: (child) => {
			const layout = child.components.get('layout')
			return layout instanceof LayoutComponent ? layout : null
		},
		logger: options.logger,
	})

	options.objectsFactory.on(
		'obj-registered',
		(obj) => {
			if (!(obj instanceof EditableContainer)) {
				return
			}

			obj.events.on('size-changed', () => layoutSystem.invalidate(obj), options.scene, obj.preDestroySignal)
			obj.events.on('hierarchy-changed', () => layoutSystem.invalidate(obj), options.scene, obj.preDestroySignal)
		},
		options.scene,
		options.scene.shutdownSignal,
	)

	return layoutSystem
}
