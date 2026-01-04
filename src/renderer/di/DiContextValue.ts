import { Container } from '@needle-di/core'
import { createContext } from 'react'

export const DiContext = createContext<Container | null>(null)
