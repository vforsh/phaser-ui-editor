import { state } from '@state/State'
import md5 from 'blueimp-md5'
import path from 'path-browserify-esm'
import { match } from 'ts-pattern'
import trpc from '../../trpc'
import {
	AssetTreeBitmapFontData,
	AssetTreeData,
	AssetTreeFolderData,
	AssetTreeImageData,
	AssetTreeItemData,
	AssetTreeSpritesheetData,
	AssetTreeSpritesheetFolderData,
	AssetTreeSpritesheetFrameData,
	AssetTreeWebFontData,
	AssetTreeXmlData,
} from '../../types/assets'
import { FileTreeData, FileTreeItemData, findInFileTree } from './FileTreeData'

export type TexturePackerProject = {
	/** Absolute path to the .tps file */
	path: string
	/** Absolute path to the data file (usually JSON) */
	data: string
	/** Absolute path to the texture file (usually PNG) */
	texture: string
}

export const buildAssetTree = async (absoluteFilepaths: string[], baseDir: string): Promise<AssetTreeData> => {
	// absoluteFilepaths = absoluteFilepaths.filter((path) =>
	// path.startsWith('/Users/vlad/dev/papa-cherry-2/dev/assets/fonts')
	// )

	const fileTree = await buildFileTree(absoluteFilepaths, baseDir)
	const texturePackerProjects = await getTexturePackerProjects()
	const assets = await doBuildAssetTree(fileTree, texturePackerProjects)
	return assets
}

async function getTexturePackerProjects(): Promise<TexturePackerProject[]> {
	if (!state.project?.texturePacker) {
		return []
	}

	const { path: baseDir, mapping } = state.project.texturePacker
	const projects = await trpc.globby.query({
		patterns: [path.join(baseDir, '**/*.tps')],
	})

	const xmlParser = new DOMParser()

	const parsedProjectsPromises = projects.map(async (projectPath) => {
		const xmlContent = (await trpc.readText.query({ path: projectPath })).content
		const xml = xmlParser.parseFromString(xmlContent, 'application/xml')

		// Extract the DataFile path
		const dataFilePathRelative = xml.evaluate(
			"//key[text()='name']/following-sibling::filename",
			xml,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue?.textContent

		if (!dataFilePathRelative) {
			return null
		}

		// Extract texture format
		const textureFormat =
			xml
				.evaluate(
					"//key[text()='textureFormat']/following-sibling::enum",
					xml,
					null,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				)
				.singleNodeValue?.textContent?.toLowerCase() || 'png'

		const projectDir = path.dirname(projectPath)
		const dataFilePath = path.join(projectDir, dataFilePathRelative)

		const dataFileExists = await trpc.exists.query({ path: dataFilePath })
		if (!dataFileExists) {
			return null
		}

		const textureFilePath = path.join(projectDir, dataFilePathRelative.replace(/\.json$/, `.${textureFormat}`))

		const textureFileExists = await trpc.exists.query({ path: textureFilePath })
		if (!textureFileExists) {
			return null
		}

		return {
			path: projectPath,
			data: dataFilePath,
			texture: textureFilePath,
		}
	})

	const parsedProjects = await Promise.all(parsedProjectsPromises)

	return parsedProjects.filter((p) => p !== null) as TexturePackerProject[]
}

function parseTpsRect(rectStr: string): [number, number, number, number] | null {
	const parts = rectStr.split(',').map(Number)
	if (parts.length !== 4) return null
	return [parts[0], parts[1], parts[2], parts[3]]
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
	jsonPath: string,
	tpsProject?: TexturePackerProject
): Promise<AssetTreeSpritesheetFrameData[]> => {
	const jsonFileRaw = (await trpc.readText.query({ path: jsonPath })).content

	// as of now it handles only TexturePacker JSON format
	const atlasJson = JSON.parse(jsonFileRaw) as TexturePacker.Atlas

	// TODO handle multiple textures
	const frames = atlasJson.textures[0].frames.map((data) => {
		const frameAsset: AssetTreeSpritesheetFrameData = addAssetId({
			type: 'spritesheet-frame',
			name: data.filename,
			path: path.join(imagePath, data.filename),
			size: { w: data.frame.w, h: data.frame.h },
			anchor: data.anchor ? { x: data.anchor.x, y: data.anchor.y } : { x: 0.5, y: 0.5 },
			scale9Borders: data.scale9Borders,
			imagePath,
			jsonPath,
			pathInHierarchy: data.filename,
			project: tpsProject?.path,
		})

		return frameAsset
	})

	return frames
}

// TODO there is a bug with the folder path
// e.g. `/goal_items/candy_bottle/candy` converted to `/candy_bottle/candy`
// notice that `goal_items` is missing
function groupFramesByFolders(
	frames: AssetTreeSpritesheetFrameData[],
	tpsProject?: TexturePackerProject
): (AssetTreeSpritesheetFolderData | AssetTreeSpritesheetFrameData)[] {
	const result: (AssetTreeSpritesheetFolderData | AssetTreeSpritesheetFrameData)[] = []
	const folderMap = new Map<string, AssetTreeSpritesheetFrameData[]>()

	// Group frames by their folder path
	frames.forEach((frame) => {
		const pathParts = frame.pathInHierarchy.split('/')
		if (pathParts.length === 1) {
			// No folders, add directly to result
			result.push(frame)
		} else {
			// Has folders, group by folder path
			const folderPath = pathParts.slice(0, -1).join('/')
			const frameName = pathParts[pathParts.length - 1] // Get just the filename

			// Create a new frame object with updated name
			const frameWithStrippedName = {
				...frame,
				name: frameName,
			}

			if (!folderMap.has(folderPath)) {
				folderMap.set(folderPath, [])
			}
			folderMap.get(folderPath)!.push(frameWithStrippedName)
		}
	})

	// Convert folder groups to AssetTreeSpritesheetFolderData
	folderMap.forEach((folderFrames, folderPath) => {
		const folderName = folderPath.split('/').pop()!
		const folder: AssetTreeSpritesheetFolderData = addAssetId({
			type: 'spritesheet-folder',
			name: folderName,
			path: folderFrames[0].imagePath + '/' + folderPath,
			children: folderFrames,
			project: tpsProject?.path,
		})
		result.push(folder)
	})

	// Sort result - folders first, then frames
	return result.sort((a, b) => {
		if (a.type === 'spritesheet-folder' && b.type === 'spritesheet-frame') {
			return -1
		}
		if (a.type === 'spritesheet-frame' && b.type === 'spritesheet-folder') {
			return 1
		}
		return a.name.localeCompare(b.name)
	})
}

function setSpritesheetFramesParentId(
	children: (AssetTreeSpritesheetFrameData | AssetTreeSpritesheetFolderData)[],
	parentId: string
) {
	children.forEach((frame) => {
		if (frame.type === 'spritesheet-frame') {
			frame.parentId = parentId
		} else if (frame.type === 'spritesheet-folder') {
			setSpritesheetFramesParentId(frame.children, parentId)
		}
	})
}

const doBuildAssetTree = async (
	fileTree: FileTreeData,
	texturePackerProjects: TexturePackerProject[]
): Promise<AssetTreeData> => {
	const processedItems = new Set<FileTreeItemData>()

	const convertToAsset = async (file: FileTreeItemData): Promise<AssetTreeItemData> => {
		return match(file)
			.returnType<Promise<AssetTreeItemData>>()
			.with({ type: 'folder' }, async (folder) => {
				const childAssets: AssetTreeItemData[] = []

				const children = folder.children.slice().sort((a, b) => {
					// folders should be first
					if (a.type === 'folder' && b.type === 'file') {
						return -1
					}

					if (a.type === 'file' && b.type === 'folder') {
						return 1
					}

					if (a.type === 'file' && b.type === 'file') {
						// images should be first so we can correctly find the spritesheets and bitmap fonts
						if (isImageFile(a.name) && !isImageFile(b.name)) {
							return -1
						}

						return a.name.localeCompare(b.name)
					}

					return a.name.localeCompare(b.name)
				})

				for (let i = 0; i < children.length; i++) {
					const child = children[i]
					if (processedItems.has(child)) {
						continue
					}

					const asset = await convertToAsset(child)
					childAssets.push(asset)
				}

				const folderAsset: AssetTreeFolderData = addAssetId({
					type: 'folder',
					name: folder.name,
					path: folder.path,
					children: childAssets,
				})

				return folderAsset
			})
			.with({ type: 'file' }, async (fileTreeItem) => {
				if (isImageFile(fileTreeItem.name)) {
					const imageSize = await trpc.readImageSize.query({ path: fileTreeItem.path })
					const image: AssetTreeImageData = addAssetId({
						type: 'image',
						name: fileTreeItem.name,
						path: fileTreeItem.path,
						size: { w: imageSize.width!, h: imageSize.height! },
					})

					const jsonFileName = fileTreeItem.name.replace(/\.[^/.]+$/, '.json')
					const jsonFilePath = path.join(path.dirname(fileTreeItem.path), jsonFileName)
					const jsonFile = findInFileTree(jsonFilePath, fileTree)
					if (jsonFile) {
						// to skip processing the JSON file again
						processedItems.add(jsonFile)

						const subtype = await isSpritesheetOrBitmapFont(fileTreeItem.path, jsonFilePath)
						return match(subtype)
							.with('spritesheet', async () => {
								// TODO group frames in folders
								const texturePackerProject = texturePackerProjects.find((p) => p.data === jsonFile.path)

								const frames = (
									await extractSpritesheetFrames(image.path, jsonFilePath, texturePackerProject)
								).sort((a, b) => a.name.localeCompare(b.name))

								const framesByFolders = groupFramesByFolders(frames, texturePackerProject)

								const spritesheet: AssetTreeSpritesheetData = addAssetId({
									type: 'spritesheet',
									name: image.name,
									path: jsonFile.path,
									image,
									json: addAssetId({
										type: 'json',
										name: jsonFile.name,
										path: jsonFile.path,
									}),
									frames: framesByFolders,
									project: texturePackerProject?.path,
								})

								setSpritesheetFramesParentId(spritesheet.frames, spritesheet.id)

								return spritesheet
							})
							.with('bitmap-font', async () => {
								const bitmapFontData = await trpc.readJson.query({ path: jsonFile.path })
								const bitmapFont: AssetTreeBitmapFontData = addAssetId({
									type: 'bitmap-font',
									name: path.basename(fileTreeItem.name, path.extname(fileTreeItem.name)),
									path: jsonFile.path,
									image,
									imageExtra: bitmapFontData.extra,
									data: addAssetId({
										type: 'json',
										name: jsonFile.name,
										path: jsonFile.path,
									}),
								})
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

						const data: AssetTreeXmlData = addAssetId({
							type: 'xml',
							name: xmlFile.name,
							path: xmlFile.path,
						})

						const bitmapFont: AssetTreeBitmapFontData = addAssetId({
							type: 'bitmap-font',
							name: path.basename(fileTreeItem.name, path.extname(fileTreeItem.name)),
							path: xmlFile.path,
							image,
							data,
						})

						return bitmapFont
					}

					return image
				} else if (isJsonFile(fileTreeItem.name)) {
					return addAssetId({
						type: 'json',
						name: fileTreeItem.name,
						path: fileTreeItem.path,
					})
				} else if (isWebFontFile(fileTreeItem.name)) {
					const webFontData = await trpc.parseWebFont.query({ path: fileTreeItem.path })

					const webFont: AssetTreeWebFontData = addAssetId({
						type: 'web-font',
						fontFamily: webFontData.familyName,
						name: fileTreeItem.name,
						path: fileTreeItem.path,
					})

					return webFont
				}

				return addAssetId({
					type: 'file',
					name: fileTreeItem.name,
					path: fileTreeItem.path,
				})
			})
			.exhaustive()
	}

	const assets: AssetTreeData = []

	for (let i = 0; i < fileTree.length; i++) {
		const file = fileTree[i]
		if (processedItems.has(file)) {
			continue
		}

		const asset = await convertToAsset(file)
		assets.push(asset)
	}

	return assets
}

type AssetWithoutId<T extends AssetTreeItemData> = Omit<T, 'id'>

/**
 * Adds an id to the asset.
 * @note it mutates the asset object
 */
export function addAssetId<T extends AssetTreeItemData>(asset: AssetWithoutId<T>): T & { id: string } {
	const assetId = createAssetId(asset)

	console.log(asset.path, asset.type, assetId)

	return Object.assign(asset, { id: assetId }) as T & { id: string }
}

function createAssetId(asset: AssetWithoutId<AssetTreeItemData>): string {
	return md5(asset.path + '__' + asset.name + '__' + asset.type).slice(0, 10)
}
