import { UrlParams } from '@url-params'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { logger } from './logs/logs'
import './styles/index.css'
import './polyfills'
import { installRendererErrorStackForwarderForHmr } from './utils/RendererErrorStackForwarder'

installRendererErrorStackForwarderForHmr()
const urlParamsLogger = logger.getOrCreate('url-params')
UrlParams.configure({ logger: urlParamsLogger })

const presentUrlParams = Object.entries(UrlParams.getAll()).filter(([, value]) => value !== null)
urlParamsLogger.debug('URL params:', Object.fromEntries(presentUrlParams))

createRoot(document.getElementById('root')!).render(
	// <StrictMode>
	<App />,
	// </StrictMode>,
)
