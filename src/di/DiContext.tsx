import { ReactNode } from 'react'
import { DependencyContainer } from 'tsyringe'
import { DiContext } from './DiContextValue'

type DiProviderProps = {
	container: DependencyContainer
	children: ReactNode
}

export function DiProvider({ container, children }: DiProviderProps) {
	return <DiContext.Provider value={container}>{children}</DiContext.Provider>
}
