import { z } from 'zod'
export declare const projectConfigSchema: z.ZodObject<
	{
		name: z.ZodString
		slug: z.ZodOptional<z.ZodString>
		l10n: z.ZodOptional<z.ZodString>
		texturePacker: z.ZodObject<
			{
				path: z.ZodString
				mapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
				mapping?: Record<string, string> | undefined
			},
			{
				path: string
				mapping?: Record<string, string> | undefined
			}
		>
		assetsDir: z.ZodString
		assetsIgnore: z.ZodArray<z.ZodString, 'many'>
		size: z.ZodObject<
			{
				width: z.ZodNumber
				height: z.ZodNumber
			},
			'strict',
			z.ZodTypeAny,
			{
				width: number
				height: number
			},
			{
				width: number
				height: number
			}
		>
	},
	'strict',
	z.ZodTypeAny,
	{
		name: string
		texturePacker: {
			path: string
			mapping?: Record<string, string> | undefined
		}
		assetsDir: string
		assetsIgnore: string[]
		size: {
			width: number
			height: number
		}
		slug?: string | undefined
		l10n?: string | undefined
	},
	{
		name: string
		texturePacker: {
			path: string
			mapping?: Record<string, string> | undefined
		}
		assetsDir: string
		assetsIgnore: string[]
		size: {
			width: number
			height: number
		}
		slug?: string | undefined
		l10n?: string | undefined
	}
>
export type ProjectConfig = z.infer<typeof projectConfigSchema>
export declare const getProjectInfoCommand: {
	group: 'misc'
	description: string
	input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
	output: z.ZodObject<
		{
			name: z.ZodString
			slug: z.ZodOptional<z.ZodString>
			l10n: z.ZodOptional<z.ZodString>
			texturePacker: z.ZodObject<
				{
					path: z.ZodString
					mapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>
				},
				'strict',
				z.ZodTypeAny,
				{
					path: string
					mapping?: Record<string, string> | undefined
				},
				{
					path: string
					mapping?: Record<string, string> | undefined
				}
			>
			assetsDir: z.ZodString
			assetsIgnore: z.ZodArray<z.ZodString, 'many'>
			size: z.ZodObject<
				{
					width: z.ZodNumber
					height: z.ZodNumber
				},
				'strict',
				z.ZodTypeAny,
				{
					width: number
					height: number
				},
				{
					width: number
					height: number
				}
			>
		} & {
			path: z.ZodString
		},
		'strict',
		z.ZodTypeAny,
		{
			path: string
			name: string
			texturePacker: {
				path: string
				mapping?: Record<string, string> | undefined
			}
			assetsDir: string
			assetsIgnore: string[]
			size: {
				width: number
				height: number
			}
			slug?: string | undefined
			l10n?: string | undefined
		},
		{
			path: string
			name: string
			texturePacker: {
				path: string
				mapping?: Record<string, string> | undefined
			}
			assetsDir: string
			assetsIgnore: string[]
			size: {
				width: number
				height: number
			}
			slug?: string | undefined
			l10n?: string | undefined
		}
	>
}
//# sourceMappingURL=getProjectInfo.d.ts.map
