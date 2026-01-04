import { DependencyContainer, container as rootContainer } from 'tsyringe'

import { TOKENS, type PhaserScope } from './tokens'

export function createContainer(): DependencyContainer {
	const diContainer = rootContainer.createChildContainer()

	const phaserScope: PhaserScope = {
		events: null,
		commands: null,
	}

	diContainer.registerInstance(TOKENS.PhaserScope, phaserScope)

	return diContainer
}
