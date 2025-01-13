// should be imported BEFORE react-dom/client
import { scan } from 'react-scan'

// should be imported AFTER react-scan
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './polyfills'
import { urlParams } from '@url-params'

if (urlParams.getBool('scan')) {
	scan({
		enabled: true,
		log: false, // logs render info to console (default: false)
	})
}

createRoot(document.getElementById('root')!).render(
	// <StrictMode>
	<App />
	// </StrictMode>,
)
