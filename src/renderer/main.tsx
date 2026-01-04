import { createRoot } from 'react-dom/client'
import 'reflect-metadata'
import App from './App.tsx'
import './index.css'
import './polyfills'
import { installRendererErrorStackForwarderForHmr } from './utils/RendererErrorStackForwarder'

installRendererErrorStackForwarderForHmr()

createRoot(document.getElementById('root')!).render(
	// <StrictMode>
	<App />,
	// </StrictMode>,
)
