import path from 'path-browserify-esm'
import { useMemo } from 'react'

export function useProjectPathValidation(projectPath: string) {
	return useMemo(() => {
		if (!projectPath) {
			return { isValid: false, validationMessage: undefined }
		}

		if (!path.isAbsolute(projectPath)) {
			return {
				isValid: false,
				validationMessage: 'Project path must be absolute',
			}
		}

		// Additional validation can be added here
		return { isValid: true, validationMessage: undefined }
	}, [projectPath])
}
