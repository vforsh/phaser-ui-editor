import { createContext } from 'react'
import { DependencyContainer } from 'tsyringe'

export const DiContext = createContext<DependencyContainer | null>(null)
