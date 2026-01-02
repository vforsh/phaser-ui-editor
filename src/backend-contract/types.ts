import { z } from 'zod'
import { backendContract, webFontParsedSchema } from './contract'

export type BackendContract = typeof backendContract
export type BackendMethod = keyof BackendContract

export type BackendInput<M extends BackendMethod> = z.input<BackendContract[M]['input']>
export type BackendOutput<M extends BackendMethod> = z.output<BackendContract[M]['output']>

export type BackendApi = {
	[M in BackendMethod]: (input: BackendInput<M>) => Promise<BackendOutput<M>>
}

export type WebFontParsed = z.output<typeof webFontParsedSchema>
