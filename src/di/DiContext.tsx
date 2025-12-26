import { createContext, ReactNode, useContext } from 'react'
import { DependencyContainer } from 'tsyringe'

import { TOKENS, type PhaserScope } from './tokens'

type DiProviderProps = {
	container: DependencyContainer
	children: ReactNode
}

const DiContext = createContext<DependencyContainer | null>(null)

export function DiProvider({ container, children }: DiProviderProps) {
	return <DiContext.Provider value={container}>{children}</DiContext.Provider>
}

export function useDi(): DependencyContainer {
	const container = useContext(DiContext)

	if (!container) {
		throw new Error('DiProvider is missing in the component tree')
	}

	return container
}

export function useAppEvents() {
	const container = useDi()
	return container.resolve(TOKENS.AppEvents)
}

export function useAppCommands() {
	const container = useDi()
	return container.resolve(TOKENS.AppCommands)
}

export function usePhaserScope(): PhaserScope {
	const container = useDi()
	return container.resolve(TOKENS.PhaserScope)
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

