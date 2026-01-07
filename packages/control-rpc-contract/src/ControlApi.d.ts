import { z } from 'zod'
export declare const COMMAND_GROUPS: {
	readonly assets: 'assets'
	readonly objects: 'objects'
	readonly hierarchy: 'hierarchy'
	readonly misc: 'misc'
	readonly debug: 'debug'
}
export type CommandGroup = keyof typeof COMMAND_GROUPS
/**
 * Defines a single control RPC command with its metadata and Zod schemas.
 *
 * Use this with the `satisfies` operator to ensure the command matches the required structure
 * while preserving the specific Zod types for better inference.
 */
export type CommandDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> = {
	group: CommandGroup
	description: string
	input: I
	output: O
}
export { controlMetaSchema, type ControlMeta, type ControlMetaMethod } from './commands/getControlMeta'
export { projectConfigSchema, type ProjectConfig } from './commands/getProjectInfo'
export { assetNodeSchema, assetTypeSchema, type AssetNode, type AssetType } from './commands/listAssets'
export { hierarchyNodeSchema, type HierarchyNode } from './commands/listHierarchy'
export { successSchema } from './shared-schemas'
export declare const controlContract: {
	readonly addObjectComponent: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				componentJson: z.ZodObject<
					{
						type: z.ZodString
					},
					'passthrough',
					z.ZodTypeAny,
					z.objectOutputType<
						{
							type: z.ZodString
						},
						z.ZodTypeAny,
						'passthrough'
					>,
					z.objectInputType<
						{
							type: z.ZodString
						},
						z.ZodTypeAny,
						'passthrough'
					>
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				componentJson: {
					type: string
				} & {
					[k: string]: unknown
				}
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				componentJson: {
					type: string
				} & {
					[k: string]: unknown
				}
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly openProject: {
		group: 'misc'
		description: string
		input: z.ZodObject<
			{
				path: z.ZodString
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
			},
			{
				path: string
			}
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly openModal: {
		group: 'misc'
		description: string
		input: z.ZodDiscriminatedUnion<
			'id',
			[
				z.ZodObject<
					{
						id: z.ZodLiteral<'settings'>
						params: z.ZodOptional<
							z.ZodObject<
								{
									sectionId: z.ZodEnum<['general', 'hierarchy', 'canvas', 'assets', 'inspector', 'dev', 'misc']>
								},
								'strict',
								z.ZodTypeAny,
								{
									sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
								},
								{
									sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
								}
							>
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						id: 'settings'
						params?:
							| {
									sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
							  }
							| undefined
					},
					{
						id: 'settings'
						params?:
							| {
									sectionId: 'assets' | 'hierarchy' | 'misc' | 'general' | 'canvas' | 'inspector' | 'dev'
							  }
							| undefined
					}
				>,
				z.ZodObject<
					{
						id: z.ZodLiteral<'controlRpcCommands'>
						params: z.ZodOptional<
							z.ZodObject<
								{
									group: z.ZodEnum<['assets', 'objects', 'hierarchy', 'misc', 'debug', 'all']>
								},
								'strict',
								z.ZodTypeAny,
								{
									group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
								},
								{
									group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
								}
							>
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						id: 'controlRpcCommands'
						params?:
							| {
									group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
							  }
							| undefined
					},
					{
						id: 'controlRpcCommands'
						params?:
							| {
									group: 'debug' | 'assets' | 'objects' | 'hierarchy' | 'misc' | 'all'
							  }
							| undefined
					}
				>,
			]
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly closeModal: {
		group: 'misc'
		description: string
		input: z.ZodObject<
			{
				id: z.ZodEnum<['settings', 'controlRpcCommands']>
			},
			'strict',
			z.ZodTypeAny,
			{
				id: 'settings' | 'controlRpcCommands'
			},
			{
				id: 'settings' | 'controlRpcCommands'
			}
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly closeAllModals: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly listModals: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				activeModalId: z.ZodNullable<z.ZodEnum<['settings', 'controlRpcCommands']>>
				modals: z.ZodArray<
					z.ZodObject<
						{
							id: z.ZodEnum<['settings', 'controlRpcCommands']>
							isOpen: z.ZodBoolean
						},
						'strict',
						z.ZodTypeAny,
						{
							id: 'settings' | 'controlRpcCommands'
							isOpen: boolean
						},
						{
							id: 'settings' | 'controlRpcCommands'
							isOpen: boolean
						}
					>,
					'many'
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				activeModalId: 'settings' | 'controlRpcCommands' | null
				modals: {
					id: 'settings' | 'controlRpcCommands'
					isOpen: boolean
				}[]
			},
			{
				activeModalId: 'settings' | 'controlRpcCommands' | null
				modals: {
					id: 'settings' | 'controlRpcCommands'
					isOpen: boolean
				}[]
			}
		>
	}
	readonly selectAssets: {
		group: 'assets'
		description: string
		input: z.ZodObject<
			{
				assets: z.ZodArray<
					z.ZodUnion<
						[
							z.ZodObject<
								{
									id: z.ZodString
								},
								'strict',
								z.ZodTypeAny,
								{
									id: string
								},
								{
									id: string
								}
							>,
							z.ZodObject<
								{
									path: z.ZodString
								},
								'strict',
								z.ZodTypeAny,
								{
									path: string
								},
								{
									path: string
								}
							>,
						]
					>,
					'many'
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				assets: (
					| {
							id: string
					  }
					| {
							path: string
					  }
				)[]
			},
			{
				assets: (
					| {
							id: string
					  }
					| {
							path: string
					  }
				)[]
			}
		>
		output: z.ZodObject<
			{
				assetIds: z.ZodArray<z.ZodString, 'many'>
			},
			'strict',
			z.ZodTypeAny,
			{
				assetIds: string[]
			},
			{
				assetIds: string[]
			}
		>
	}
	readonly getProjectInfo: {
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
	readonly openPrefab: {
		group: 'assets'
		description: string
		input: z.ZodUnion<
			[
				z.ZodObject<
					{
						assetId: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						assetId: string
					},
					{
						assetId: string
					}
				>,
				z.ZodObject<
					{
						path: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						path: string
					},
					{
						path: string
					}
				>,
			]
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly listHierarchy: {
		group: 'hierarchy'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodType<import('./ControlApi').HierarchyNode, z.ZodTypeDef, import('./ControlApi').HierarchyNode>
	}
	readonly listAssets: {
		group: 'assets'
		description: string
		input: z.ZodObject<
			{
				types: z.ZodOptional<
					z.ZodArray<
						z.ZodEnum<
							[
								'folder',
								'file',
								'json',
								'xml',
								'image',
								'prefab',
								'web-font',
								'bitmap-font',
								'spritesheet',
								'spritesheet-folder',
								'spritesheet-frame',
							]
						>,
						'many'
					>
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				types?:
					| (
							| 'folder'
							| 'file'
							| 'json'
							| 'xml'
							| 'image'
							| 'prefab'
							| 'web-font'
							| 'bitmap-font'
							| 'spritesheet'
							| 'spritesheet-folder'
							| 'spritesheet-frame'
					  )[]
					| undefined
			},
			{
				types?:
					| (
							| 'folder'
							| 'file'
							| 'json'
							| 'xml'
							| 'image'
							| 'prefab'
							| 'web-font'
							| 'bitmap-font'
							| 'spritesheet'
							| 'spritesheet-folder'
							| 'spritesheet-frame'
					  )[]
					| undefined
			}
		>
		output: z.ZodObject<
			{
				assets: z.ZodArray<z.ZodType<import('./ControlApi').AssetNode, z.ZodTypeDef, import('./ControlApi').AssetNode>, 'many'>
			},
			'strict',
			z.ZodTypeAny,
			{
				assets: import('./ControlApi').AssetNode[]
			},
			{
				assets: import('./ControlApi').AssetNode[]
			}
		>
	}
	readonly selectObject: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly switchToContext: {
		group: 'misc'
		description: string
		input: z.ZodUnion<
			[
				z.ZodObject<
					{
						id: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						id: string
					},
					{
						id: string
					}
				>,
				z.ZodObject<
					{
						path: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						path: string
					},
					{
						path: string
					}
				>,
			]
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly deleteObjects: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				ids: z.ZodArray<z.ZodString, 'many'>
			},
			'strict',
			z.ZodTypeAny,
			{
				ids: string[]
			},
			{
				ids: string[]
			}
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly createObject: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				parent: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				type: z.ZodEnum<['Container', 'Image', 'NineSlice', 'Text', 'BitmapText']>
			},
			'strict',
			z.ZodTypeAny,
			{
				type: 'Container' | 'Image' | 'NineSlice' | 'Text' | 'BitmapText'
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
			},
			{
				type: 'Container' | 'Image' | 'NineSlice' | 'Text' | 'BitmapText'
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
						createdId: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
						createdId: string
					},
					{
						ok: true
						createdId: string
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly createObjectFromAsset: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				parent: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				assetId: z.ZodString
				position: z.ZodOptional<
					z.ZodObject<
						{
							x: z.ZodNumber
							y: z.ZodNumber
						},
						'strict',
						z.ZodTypeAny,
						{
							x: number
							y: number
						},
						{
							x: number
							y: number
						}
					>
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				assetId: string
				position?:
					| {
							x: number
							y: number
					  }
					| undefined
			},
			{
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				assetId: string
				position?:
					| {
							x: number
							y: number
					  }
					| undefined
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
						createdId: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
						createdId: string
					},
					{
						ok: true
						createdId: string
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly duplicateObject: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly moveObjectInHierarchy: {
		group: 'hierarchy'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				newParent: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				newIndex: z.ZodNumber
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				newParent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				newIndex: number
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				newParent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				newIndex: number
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly renameObject: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				name: z.ZodString
			},
			'strict',
			z.ZodTypeAny,
			{
				name: string
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			},
			{
				name: string
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly patchObject: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				patch: z.ZodRecord<z.ZodString, z.ZodUnknown>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				patch: Record<string, unknown>
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				patch: Record<string, unknown>
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly patchObjectComponent: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				component: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								type: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								type: string
							},
							{
								type: string
							}
						>,
					]
				>
				patch: z.ZodRecord<z.ZodString, z.ZodUnknown>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				patch: Record<string, unknown>
				component:
					| {
							id: string
					  }
					| {
							type: string
					  }
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				patch: Record<string, unknown>
				component:
					| {
							id: string
					  }
					| {
							type: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly removeObjectComponent: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				component: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								type: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								type: string
							},
							{
								type: string
							}
						>,
					]
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				component:
					| {
							id: string
					  }
					| {
							type: string
					  }
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
				component:
					| {
							id: string
					  }
					| {
							type: string
					  }
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly getObjectMeta: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				target: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			},
			{
				target:
					| {
							id: string
					  }
					| {
							path: string
					  }
			}
		>
		output: z.ZodObject<
			{
				id: z.ZodString
				name: z.ZodString
				type: z.ZodString
				path: z.ZodOptional<z.ZodString>
			},
			'strict',
			z.ZodTypeAny,
			{
				type: string
				name: string
				id: string
				path?: string | undefined
			},
			{
				type: string
				name: string
				id: string
				path?: string | undefined
			}
		>
	}
	readonly getAssetInfo: {
		group: 'assets'
		description: string
		input: z.ZodUnion<
			[
				z.ZodObject<
					{
						id: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						id: string
					},
					{
						id: string
					}
				>,
				z.ZodObject<
					{
						path: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						path: string
					},
					{
						path: string
					}
				>,
			]
		>
		output: z.ZodType<import('./ControlApi').AssetNode, z.ZodTypeDef, import('./ControlApi').AssetNode>
	}
	readonly getSelectedAssets: {
		group: 'assets'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				ids: z.ZodArray<z.ZodString, 'many'>
			},
			'strict',
			z.ZodTypeAny,
			{
				ids: string[]
			},
			{
				ids: string[]
			}
		>
	}
	readonly getObject: {
		group: 'objects'
		description: string
		input: z.ZodUnion<
			[
				z.ZodObject<
					{
						id: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						id: string
					},
					{
						id: string
					}
				>,
				z.ZodObject<
					{
						path: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						path: string
					},
					{
						path: string
					}
				>,
			]
		>
		output: z.ZodUnknown
	}
	readonly getPrefabContent: {
		group: 'objects'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodUnknown
	}
	readonly getPrefabDocument: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				kind: z.ZodLiteral<'expanded'>
				content: z.ZodUnknown
			},
			'strict',
			z.ZodTypeAny,
			{
				kind: 'expanded'
				content?: unknown
			},
			{
				kind: 'expanded'
				content?: unknown
			}
		>
	}
	readonly getCanvasState: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				currentPrefab: z.ZodOptional<
					z.ZodObject<
						{
							id: z.ZodString
							name: z.ZodString
						},
						'strip',
						z.ZodTypeAny,
						{
							name: string
							id: string
						},
						{
							name: string
							id: string
						}
					>
				>
				activeContextId: z.ZodOptional<z.ZodString>
				selectionIds: z.ZodArray<z.ZodString, 'many'>
				hasUnsavedChanges: z.ZodBoolean
				camera: z.ZodObject<
					{
						zoom: z.ZodNumber
						scrollX: z.ZodNumber
						scrollY: z.ZodNumber
					},
					'strict',
					z.ZodTypeAny,
					{
						zoom: number
						scrollX: number
						scrollY: number
					},
					{
						zoom: number
						scrollX: number
						scrollY: number
					}
				>
			},
			'strict',
			z.ZodTypeAny,
			{
				selectionIds: string[]
				hasUnsavedChanges: boolean
				camera: {
					zoom: number
					scrollX: number
					scrollY: number
				}
				currentPrefab?:
					| {
							name: string
							id: string
					  }
					| undefined
				activeContextId?: string | undefined
			},
			{
				selectionIds: string[]
				hasUnsavedChanges: boolean
				camera: {
					zoom: number
					scrollX: number
					scrollY: number
				}
				currentPrefab?:
					| {
							name: string
							id: string
					  }
					| undefined
				activeContextId?: string | undefined
			}
		>
	}
	readonly getCanvasMetrics: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				width: z.ZodNumber
				height: z.ZodNumber
				isConnected: z.ZodBoolean
				currentPrefabAssetId: z.ZodOptional<z.ZodString>
			},
			'strict',
			z.ZodTypeAny,
			{
				width: number
				height: number
				isConnected: boolean
				currentPrefabAssetId?: string | undefined
			},
			{
				width: number
				height: number
				isConnected: boolean
				currentPrefabAssetId?: string | undefined
			}
		>
	}
	readonly getControlMeta: {
		group: 'debug'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodObject<
			{
				schemaVersion: z.ZodNumber
				methods: z.ZodArray<
					z.ZodObject<
						{
							method: z.ZodString
							group: z.ZodString
							description: z.ZodString
							inputSchema: z.ZodUnknown
							outputSchema: z.ZodUnknown
						},
						'strict',
						z.ZodTypeAny,
						{
							method: string
							group: string
							description: string
							inputSchema?: unknown
							outputSchema?: unknown
						},
						{
							method: string
							group: string
							description: string
							inputSchema?: unknown
							outputSchema?: unknown
						}
					>,
					'many'
				>
				appVersion: z.ZodOptional<z.ZodString>
				generatedAt: z.ZodOptional<z.ZodString>
			},
			'strict',
			z.ZodTypeAny,
			{
				schemaVersion: number
				methods: {
					method: string
					group: string
					description: string
					inputSchema?: unknown
					outputSchema?: unknown
				}[]
				appVersion?: string | undefined
				generatedAt?: string | undefined
			},
			{
				schemaVersion: number
				methods: {
					method: string
					group: string
					description: string
					inputSchema?: unknown
					outputSchema?: unknown
				}[]
				appVersion?: string | undefined
				generatedAt?: string | undefined
			}
		>
	}
	readonly listEditors: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodArray<
			z.ZodObject<
				{
					wsUrl: z.ZodString
					wsPort: z.ZodNumber
					appLaunchDir: z.ZodString
					projectPath: z.ZodNullable<z.ZodString>
					e2e: z.ZodDiscriminatedUnion<
						'enabled',
						[
							z.ZodObject<
								{
									enabled: z.ZodLiteral<false>
								},
								'strict',
								z.ZodTypeAny,
								{
									enabled: false
								},
								{
									enabled: false
								}
							>,
							z.ZodObject<
								{
									enabled: z.ZodLiteral<true>
									instanceKey: z.ZodString
								},
								'strict',
								z.ZodTypeAny,
								{
									enabled: true
									instanceKey: string
								},
								{
									enabled: true
									instanceKey: string
								}
							>,
						]
					>
				},
				'strict',
				z.ZodTypeAny,
				{
					wsUrl: string
					wsPort: number
					appLaunchDir: string
					projectPath: string | null
					e2e:
						| {
								enabled: false
						  }
						| {
								enabled: true
								instanceKey: string
						  }
				},
				{
					wsUrl: string
					wsPort: number
					appLaunchDir: string
					projectPath: string | null
					e2e:
						| {
								enabled: false
						  }
						| {
								enabled: true
								instanceKey: string
						  }
				}
			>,
			'many'
		>
	}
	readonly setCamera: {
		group: 'misc'
		description: string
		input: z.ZodObject<
			{
				zoom: z.ZodOptional<z.ZodNumber>
				scrollX: z.ZodOptional<z.ZodNumber>
				scrollY: z.ZodOptional<z.ZodNumber>
			},
			'strict',
			z.ZodTypeAny,
			{
				zoom?: number | undefined
				scrollX?: number | undefined
				scrollY?: number | undefined
			},
			{
				zoom?: number | undefined
				scrollX?: number | undefined
				scrollY?: number | undefined
			}
		>
		output: z.ZodObject<
			{
				success: z.ZodLiteral<true>
			},
			'strict',
			z.ZodTypeAny,
			{
				success: true
			},
			{
				success: true
			}
		>
	}
	readonly waitForCanvasIdle: {
		group: 'misc'
		description: string
		input: z.ZodObject<
			{
				timeoutMs: z.ZodOptional<z.ZodNumber>
				pollMs: z.ZodOptional<z.ZodNumber>
			},
			'strict',
			z.ZodTypeAny,
			{
				timeoutMs?: number | undefined
				pollMs?: number | undefined
			},
			{
				timeoutMs?: number | undefined
				pollMs?: number | undefined
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly takeAppScreenshot: {
		group: 'debug'
		description: string
		input: z.ZodObject<
			{
				clean: z.ZodOptional<z.ZodBoolean>
				format: z.ZodOptional<z.ZodEnum<['png', 'jpg', 'webp']>>
			},
			'strict',
			z.ZodTypeAny,
			{
				format?: 'png' | 'jpg' | 'webp' | undefined
				clean?: boolean | undefined
			},
			{
				format?: 'png' | 'jpg' | 'webp' | undefined
				clean?: boolean | undefined
			}
		>
		output: z.ZodObject<
			{
				path: z.ZodEffects<z.ZodString, string, string>
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
			},
			{
				path: string
			}
		>
	}
	readonly takeAppPartScreenshot: {
		group: 'debug'
		description: string
		input: z.ZodObject<
			{
				selector: z.ZodString
				format: z.ZodOptional<z.ZodEnum<['png', 'jpg', 'webp']>>
				quality: z.ZodOptional<z.ZodNumber>
				scale: z.ZodOptional<z.ZodNumber>
				includeFixed: z.ZodOptional<z.ZodEnum<['none', 'intersecting', 'all']>>
				backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>
				clipToViewport: z.ZodOptional<z.ZodBoolean>
			},
			'strict',
			z.ZodTypeAny,
			{
				selector: string
				format?: 'png' | 'jpg' | 'webp' | undefined
				quality?: number | undefined
				scale?: number | undefined
				includeFixed?: 'all' | 'none' | 'intersecting' | undefined
				backgroundColor?: string | null | undefined
				clipToViewport?: boolean | undefined
			},
			{
				selector: string
				format?: 'png' | 'jpg' | 'webp' | undefined
				quality?: number | undefined
				scale?: number | undefined
				includeFixed?: 'all' | 'none' | 'intersecting' | undefined
				backgroundColor?: string | null | undefined
				clipToViewport?: boolean | undefined
			}
		>
		output: z.ZodObject<
			{
				path: z.ZodEffects<z.ZodString, string, string>
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
			},
			{
				path: string
			}
		>
	}
	readonly takeCanvasScreenshot: {
		group: 'debug'
		description: string
		input: z.ZodObject<
			{
				clean: z.ZodOptional<z.ZodBoolean>
				format: z.ZodOptional<z.ZodEnum<['png', 'jpg', 'webp']>>
			},
			'strict',
			z.ZodTypeAny,
			{
				format?: 'png' | 'jpg' | 'webp' | undefined
				clean?: boolean | undefined
			},
			{
				format?: 'png' | 'jpg' | 'webp' | undefined
				clean?: boolean | undefined
			}
		>
		output: z.ZodObject<
			{
				path: z.ZodEffects<z.ZodString, string, string>
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
			},
			{
				path: string
			}
		>
	}
	readonly savePrefab: {
		group: 'misc'
		description: string
		input: z.ZodObject<{}, 'strict', z.ZodTypeAny, {}, {}>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
					},
					{
						ok: true
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly createPrefabInstance: {
		group: 'objects'
		description: string
		input: z.ZodObject<
			{
				parent: z.ZodUnion<
					[
						z.ZodObject<
							{
								id: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								id: string
							},
							{
								id: string
							}
						>,
						z.ZodObject<
							{
								path: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								path: string
							},
							{
								path: string
							}
						>,
					]
				>
				prefabAssetId: z.ZodString
				position: z.ZodOptional<
					z.ZodObject<
						{
							x: z.ZodNumber
							y: z.ZodNumber
						},
						'strict',
						z.ZodTypeAny,
						{
							x: number
							y: number
						},
						{
							x: number
							y: number
						}
					>
				>
				insertIndex: z.ZodOptional<z.ZodNumber>
			},
			'strict',
			z.ZodTypeAny,
			{
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				prefabAssetId: string
				position?:
					| {
							x: number
							y: number
					  }
					| undefined
				insertIndex?: number | undefined
			},
			{
				parent:
					| {
							id: string
					  }
					| {
							path: string
					  }
				prefabAssetId: string
				position?:
					| {
							x: number
							y: number
					  }
					| undefined
				insertIndex?: number | undefined
			}
		>
		output: z.ZodUnion<
			[
				z.ZodObject<
					{
						ok: z.ZodLiteral<true>
						createdId: z.ZodString
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: true
						createdId: string
					},
					{
						ok: true
						createdId: string
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						error: z.ZodObject<
							{
								kind: z.ZodEnum<['validation', 'io', 'internal', 'timeout', 'not_supported_yet']>
								message: z.ZodString
							},
							'strict',
							z.ZodTypeAny,
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							},
							{
								message: string
								kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					},
					{
						ok: false
						error: {
							message: string
							kind: 'validation' | 'io' | 'internal' | 'timeout' | 'not_supported_yet'
						}
					}
				>,
				z.ZodObject<
					{
						ok: z.ZodLiteral<false>
						blocked: z.ZodObject<
							{
								reason: z.ZodString
								message: z.ZodOptional<z.ZodString>
							},
							'strict',
							z.ZodTypeAny,
							{
								reason: string
								message?: string | undefined
							},
							{
								reason: string
								message?: string | undefined
							}
						>
					},
					'strict',
					z.ZodTypeAny,
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					},
					{
						ok: false
						blocked: {
							reason: string
							message?: string | undefined
						}
					}
				>,
			]
		>
	}
	readonly createPrefabAsset: {
		group: 'assets'
		description: string
		input: z.ZodObject<
			{
				path: z.ZodString
				prefabData: z.ZodOptional<z.ZodUnknown>
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
				prefabData?: unknown
			},
			{
				path: string
				prefabData?: unknown
			}
		>
		output: z.ZodObject<
			{
				assetId: z.ZodString
				path: z.ZodString
			},
			'strict',
			z.ZodTypeAny,
			{
				path: string
				assetId: string
			},
			{
				path: string
				assetId: string
			}
		>
	}
}
/**
 * Full RPC contract map describing each control method's Zod `input` and `output` schemas.
 *
 * This is the source of truth used to derive method names and strongly-typed payloads.
 */
export type ControlContract = typeof controlContract
/**
 * String literal union of all supported control RPC method names.
 */
export type ControlMethod = keyof ControlContract
/**
 * Inferred (input) TypeScript type for a given control method, derived from its Zod `input` schema.
 */
export type ControlInput<M extends ControlMethod> = z.input<ControlContract[M]['input']>
/**
 * Inferred (output) TypeScript type for a given control method, derived from its Zod `output` schema.
 */
export type ControlOutput<M extends ControlMethod> = z.output<ControlContract[M]['output']>
/**
 * Strongly-typed representation of the entire control RPC API.
 *
 * This type maps each method name from the `controlContract` to its corresponding
 * async function signature, ensuring that both inputs and outputs match the Zod schemas.
 */
export type ControlApi = {
	[M in ControlMethod]: (input: ControlInput<M>) => Promise<ControlOutput<M>>
}
export declare function isControlMethod(value: unknown): value is ControlMethod
//# sourceMappingURL=ControlApi.d.ts.map
