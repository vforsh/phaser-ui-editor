import path from 'path-browserify'
import { match } from 'ts-pattern'
import trpc from '../../trpc'
import {
	AssetTreeBitmapFontData,
	AssetTreeData,
	AssetTreeImageData,
	AssetTreeItemData,
	AssetTreeSpritesheetData,
	AssetTreeSpritesheetFrameData,
	AssetTreeXmlData,
} from '../../types/assets'
import { FileTreeData, FileTreeItemData, findInFileTree } from './FileTreeData'

export const buildAssetTree = async (absoluteFilepaths: string[], baseDir: string): Promise<AssetTreeData> => {
	const fileTree = await buildFileTree(absoluteFilepaths, baseDir)
	const assets = await doBuildAssetTree(fileTree)
	return assets
}

const buildFileTree = async (absoluteFilepaths: string[], baseDir: string): Promise<FileTreeData> => {
	const root: FileTreeData = []

	const addPathToTree = (filePath: string, tree: FileTreeData) => {
		const relativePath = path.relative(baseDir, filePath)
		const parts = relativePath.split(path.sep)
		let currentLevel = tree

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]
			const existingNode = currentLevel.find((node) => node.name === part)

			if (existingNode) {
				if (existingNode.type === 'folder') {
					currentLevel = existingNode.children
				}
			} else {
				const isFile = i === parts.length - 1
				const newNode: FileTreeItemData = isFile
					? { type: 'file', name: part, path: filePath }
					: { type: 'folder', name: part, path: path.dirname(filePath), children: [] }

				currentLevel.push(newNode)

				if (newNode.type === 'folder') {
					currentLevel = newNode.children
				}
			}
		}
	}

	for (const filePath of absoluteFilepaths) {
		addPathToTree(filePath, root)
	}

	return root
}

const isImageFile = (filename: string): boolean => {
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']
	return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

const isJsonFile = (filename: string): boolean => {
	return filename.toLowerCase().endsWith('.json')
}

const isWebFontFile = (filename: string): boolean => {
	const webFontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot']
	return webFontExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

const isSpritesheetOrBitmapFont = async (
	imagePath: string,
	jsonPath: string
): Promise<'spritesheet' | 'bitmap-font' | null> => {
	const jsonFileRaw = (await trpc.readText.query({ path: jsonPath })).content
	const json = JSON.parse(jsonFileRaw)

	if ('textures' in json) {
		return 'spritesheet'
	}

	if ('chars' in json && 'pages' in json) {
		return 'bitmap-font'
	}

	return null
}

const extractSpritesheetFrames = async (
	imagePath: string,
	jsonPath: string
): Promise<AssetTreeSpritesheetFrameData[]> => {
	const jsonFileRaw = (await trpc.readText.query({ path: jsonPath })).content

	// as of now it handles only TexturePacker JSON format
	const json = JSON.parse(jsonFileRaw) as TexturePacker.Atlas

	// TODO handle multiple textures
	const frames = json.textures[0].frames.map((data) => {
		return {
			type: 'spritesheet-frame',
			name: data.filename,
			path: imagePath,
			size: { w: data.frame.w, h: data.frame.h },
			imagePath,
			jsonPath,
			pathInHierarchy: data.filename,
		} satisfies AssetTreeSpritesheetFrameData
	})

	return frames
}

const doBuildAssetTree = async (fileTree: FileTreeData): Promise<AssetTreeData> => {
	const processedItems = new Set<FileTreeItemData>()

	const convertToAssetTreeItem = async (fileTreeItem: FileTreeItemData): Promise<AssetTreeItemData> => {
		return match(fileTreeItem)
			.returnType<Promise<AssetTreeItemData>>()
			.with({ type: 'folder' }, async (fileTreeItem) => {
				const assets: AssetTreeItemData[] = []

				const children = fileTreeItem.children.slice().sort((a, b) => {
					if (a.type === 'folder' && b.type === 'file') {
						return -1
					}

					if (a.type === 'file' && b.type === 'folder') {
						return 1
					}

					if (a.type === 'file' && b.type === 'file') {
						if (isImageFile(a.name) && !isImageFile(b.name)) {
							return -1
						}
					}

					return a.name.localeCompare(b.name)
				})

				for (let i = 0; i < children.length; i++) {
					const child = children[i]
					if (processedItems.has(child)) {
						continue
					}

					const asset = await convertToAssetTreeItem(child)
					assets.push(asset)
				}

				return {
					type: 'folder',
					name: fileTreeItem.name,
					path: fileTreeItem.path,
					children: assets,
				}
			})
			.with({ type: 'file' }, async (fileTreeItem) => {
				if (isImageFile(fileTreeItem.name)) {
					const imageSize = await trpc.readImageSize.query({ path: fileTreeItem.path })
					const image: AssetTreeImageData = {
						type: 'image',
						name: fileTreeItem.name,
						path: fileTreeItem.path,
						size: { w: imageSize.width!, h: imageSize.height! },
					}

					const jsonFileName = fileTreeItem.name.replace(/\.[^/.]+$/, '.json')
					const jsonFilePath = path.join(path.dirname(fileTreeItem.path), jsonFileName)
					const jsonFile = findInFileTree(jsonFilePath, fileTree)
					if (jsonFile) {
						// to skip processing the JSON file again
						processedItems.add(jsonFile)

						const subtype = await isSpritesheetOrBitmapFont(fileTreeItem.path, jsonFilePath)
						return match(subtype)
							.with('spritesheet', async () => {
								const frames = await extractSpritesheetFrames(image.path, jsonFilePath)

								const spritesheet: AssetTreeSpritesheetData = {
									type: 'spritesheet',
									name: image.name,
									path: image.path,
									image,
									json: {
										type: 'json',
										name: jsonFile.name,
										path: jsonFile.path,
									},
									frames,
									// TODO find the TexturePacker project file (.tps)
									project: '',
								}
								return spritesheet
							})
							.with('bitmap-font', async () => {
								const bitmapFontData = await trpc.readJson.query({ path: jsonFile.path })
								const bitmapFont: AssetTreeBitmapFontData = {
									type: 'bitmap-font',
									name: path.basename(fileTreeItem.name, path.extname(fileTreeItem.name)),
									path: path.dirname(fileTreeItem.path),
									image,
									imageExtra: bitmapFontData.extra,
									data: {
										type: 'json',
										name: jsonFile.name,
										path: jsonFile.path,
									},
								}
								return bitmapFont
							})
							.otherwise(() => image)
					}

					const xmlFileName = fileTreeItem.name.replace(/\.[^/.]+$/, '.xml')
					const xmlFilePath = path.join(path.dirname(fileTreeItem.path), xmlFileName)
					const xmlFile = findInFileTree(xmlFilePath, fileTree)
					if (xmlFile) {
						// to skip processing the XML file again
						processedItems.add(xmlFile)

						const data: AssetTreeXmlData = {
							type: 'xml',
							name: xmlFile.name,
							path: xmlFile.path,
						}

						return {
							type: 'bitmap-font',
							name: path.basename(fileTreeItem.name, path.extname(fileTreeItem.name)),
							path: path.dirname(fileTreeItem.path),
							image,
							data,
						} satisfies AssetTreeBitmapFontData
					}

					return image
				} else if (isJsonFile(fileTreeItem.name)) {
					return {
						type: 'json',
						name: fileTreeItem.name,
						path: fileTreeItem.path,
					}
				} else if (isWebFontFile(fileTreeItem.name)) {
					return {
						type: 'web-font',
						name: fileTreeItem.name,
						path: fileTreeItem.path,
					}
				}

				return {
					type: 'file',
					name: fileTreeItem.name,
					path: fileTreeItem.path,
				}
			})
			.exhaustive()
	}

	const assets: AssetTreeData = []

	for (let i = 0; i < fileTree.length; i++) {
		const file = fileTree[i]
		if (processedItems.has(file)) {
			continue
		}

		const asset = await convertToAssetTreeItem(file)
		assets.push(asset)
	}

	return assets
}
