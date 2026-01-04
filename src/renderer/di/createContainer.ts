import { Container } from '@needle-di/core'

import { TOKENS, type PhaserScope } from './tokens'

export function createContainer(): Container {
	const diContainer = new Container()

	const phaserScope: PhaserScope = {
		events: null,
		commands: null,
	}

	diContainer.bind({ provide: TOKENS.PhaserScope, useValue: phaserScope })

	return diContainer
}
