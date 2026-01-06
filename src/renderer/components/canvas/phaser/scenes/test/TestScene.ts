import { logger } from '@logs/logs'
import { UrlParams } from '@url-params'
import { ILogObj, Logger } from 'tslog'

import { Project } from '../../../../../project/Project'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { EditableContainer } from '../main/objects/EditableContainer'

export type TestSceneInitData = {
	project: Project
}

export class TestScene extends BaseScene {
	declare public initData: TestSceneInitData
	private logger!: Logger<ILogObj>

	public init(data: TestSceneInitData) {
		super.init(data)

		const clearConsole = UrlParams.get('clearConsole') === 'scene'
		if (clearConsole) {
			console.clear()
		}

		this.logger = logger.getOrCreate('canvas').getSubLogger({ name: ':test' })

		this.logger.info(`${this.scene.key} init`, data)
	}

	public create(): void {
		this.logger.info(`${this.scene.key} create`)

		const ctr_1 = new EditableContainer(this, 'ctr_1', null, 0, 0)
		ctr_1.setName('ctr_1')
		ctr_1.on('destroy', () => {
			this.logger.info(`ctr_1 destroyed`)
		})
		this.add.existing(ctr_1)

		const ctr_2 = new EditableContainer(this, 'ctr_2', null, 100, 0)
		ctr_2.setName('ctr_2')
		ctr_2.on('destroy', () => {
			this.logger.info(`ctr_2 destroyed`)
		})
		this.add.existing(ctr_2)

		ctr_1.add(ctr_2)
		this.logger.info(`ctr_2 added to ctr_1`, ctr_2.parentContainer?.name)
		this.add.existing(ctr_2)
		this.logger.info(`ctr_2 added to scene`, ctr_2.parentContainer?.name)
	}

	public restart(data?: TestSceneInitData): void {
		this.scene.restart(data)
	}

	public onShutdown(): void {
		this.logger.debug(`${this.scene.key} shutdown - start`)

		super.onShutdown()

		this.logger.debug(`${this.scene.key} shutdown - complete`)
	}
}
