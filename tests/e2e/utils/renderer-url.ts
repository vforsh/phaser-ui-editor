import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { URL_PARAMS, type UrlParam } from '../../../src/renderer/url-params/UrlParamsDefinitions'

type RendererUrlParamValue = string | number | boolean
type RendererUrlParams = Partial<Record<UrlParam, RendererUrlParamValue>>

const knownParams = new Set<UrlParam>(URL_PARAMS.map((param) => param.name))

export function buildRendererUrl(params: RendererUrlParams, options?: { rendererIndexHtmlPath?: string }): string {
	const rendererIndexHtmlPath = options?.rendererIndexHtmlPath ?? path.join(process.cwd(), 'out/renderer/index.html')
	const rendererUrl = pathToFileURL(rendererIndexHtmlPath)

	for (const [key, value] of Object.entries(params)) {
		if (!knownParams.has(key as UrlParam)) {
			throw new Error(`Unknown renderer url param "${key}". Allowed params: ${[...knownParams].join(', ')}`)
		}

		if (value === undefined || value === null) {
			continue
		}

		const encoded = typeof value === 'boolean' ? (value ? '1' : '0') : typeof value === 'number' ? value.toString() : value

		rendererUrl.searchParams.set(key, encoded)
	}

	return rendererUrl.toString()
}
