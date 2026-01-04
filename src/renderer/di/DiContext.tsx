import { Container } from '@needle-di/core'
import { ReactNode } from 'react'

import { DiContext } from './DiContextValue'

type DiProviderProps = {
	container: Container
	children: ReactNode
}

export function DiProvider({ container, children }: DiProviderProps) {
	return <DiContext.Provider value={container}>{children}</DiContext.Provider>
}
