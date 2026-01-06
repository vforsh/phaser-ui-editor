import { Container } from '@needle-di/core'
import { useContext } from 'react'

import { UndoHub } from '../history/UndoHub'
import { ModalService } from '../modals/ModalService'
import { DiContext } from './DiContextValue'
import { TOKENS, type PhaserScope } from './tokens'

export function useDi(): Container {
	const container = useContext(DiContext)

	if (!container) {
		throw new Error('DiProvider is missing in the component tree')
	}

	return container
}

export function useAppEvents() {
	const container = useDi()
	return container.get(TOKENS.AppEvents)
}

export function useAppCommands() {
	const container = useDi()
	return container.get(TOKENS.AppCommands)
}

export function usePhaserScope(): PhaserScope {
	const container = useDi()
	return container.get(TOKENS.PhaserScope)
}

export function usePhaserEvents() {
	const phaserScope = usePhaserScope()

	if (!phaserScope.events) {
		throw new Error('Phaser events are not initialized')
	}

	return phaserScope.events
}

export function usePhaserCommands() {
	const phaserScope = usePhaserScope()

	if (!phaserScope.commands) {
		throw new Error('Phaser commands are not initialized')
	}

	return phaserScope.commands
}

export function useUndoHub(): UndoHub {
	const container = useDi()
	return container.get(TOKENS.UndoHub)
}

export function useModalService(): ModalService {
	const container = useDi()
	return container.get(TOKENS.ModalService)
}
