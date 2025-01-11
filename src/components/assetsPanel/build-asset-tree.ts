import { state } from '@state/State'
import { isEmpty } from 'lodash-es'
import { nanoid } from 'nanoid'
import path from 'path-browserify-esm'
import { match } from 'ts-pattern'
import trpc from '../../trpc'
import {
	AssetTreeBitmapFontData,
	AssetTreeData,
	AssetTreeFolderData,
	AssetTreeImageData,
	AssetTreeItemData,
	AssetTreeItemDataType,
	AssetTreeSpritesheetData,
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
	/** XML DOM of the .tps file */
	xml: Document
	/** Sprite settings for each frame */
	spriteSettings: {
		frameName: string
		pivotPoint: [number, number]
		spriteScale: number
		scale9Enabled: boolean
		scale9Borders: [number, number, number, number] | null
		scale9Paddings: [number, number, number, number] | null
	}[]
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

		// Extract sprite settings
		const spritesSettings: TexturePackerProject['spriteSettings'] = []
		const spriteNodes = xml.evaluate(
			"//key[@type='filename']",
			xml,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		)

		for (let i = 0; i < spriteNodes.snapshotLength; i++) {
			const filenameNode = spriteNodes.snapshotItem(i) as Element
			const filename = filenameNode.textContent
			if (!filename) continue

			const settingsStruct = filenameNode.nextElementSibling
			if (!settingsStruct || settingsStruct.getAttribute('type') !== 'IndividualSpriteSettings') continue

			const pivotPoint = xml.evaluate(
				'.//point_f',
				settingsStruct,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue?.textContent

			const spriteScale = xml.evaluate(
				".//key[text()='spriteScale']/following-sibling::double[1]",
				settingsStruct,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue?.textContent

			const scale9Enabled =
				xml.evaluate(
					".//key[text()='scale9Enabled']/following-sibling::true",
					settingsStruct,
					null,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				).singleNodeValue !== null

			const borders = xml.evaluate(
				".//key[text()='scale9Borders']/following-sibling::rect[1]",
				settingsStruct,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue?.textContent

			const paddings = xml.evaluate(
				".//key[text()='scale9Paddings']/following-sibling::rect[1]",
				settingsStruct,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue?.textContent

			spritesSettings.push({
				frameName: filename,
				pivotPoint: pivotPoint ? (pivotPoint.split(',').map(Number) as [number, number]) : [0.5, 0.5],
				spriteScale: spriteScale ? parseFloat(spriteScale) : 1,
				scale9Enabled,
				scale9Borders: borders ? parseTpsRect(borders) : null,
				scale9Paddings: paddings ? parseTpsRect(paddings) : null,
			})
		}

		return {
			path: projectPath,
			data: dataFilePath,
			texture: textureFilePath,
			xml,
			spriteSettings: spritesSettings,
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
	const json = JSON.parse(jsonFileRaw) as TexturePacker.Atlas

	// TODO handle multiple textures
	const frames = json.textures[0].frames.map((data) => {
		const frameAsset: AssetTreeSpritesheetFrameData = addAssetId({
			type: 'spritesheet-frame',
			name: data.filename,
			path: imagePath,
			size: { w: data.frame.w, h: data.frame.h },
			imagePath,
			jsonPath,
			pathInHierarchy: data.filename,
			settings: tpsProject ? (getSpritesheetFrameSettings(data, tpsProject.spriteSettings) as any) : {},
		})

		if (isEmpty(frameAsset.settings) === false) {
			console.log('===', data.filename, frameAsset.settings)
		}

		return frameAsset
	})

	return frames
}

function getSpritesheetFrameSettings(
	frame: TexturePacker.Frame,
	tpsSettings: TexturePackerProject['spriteSettings']
): AssetTreeSpritesheetFrameData['settings'] {
	const settingsXml = tpsSettings.find((settings) => settings.frameName.endsWith(frame.filename))
	if (!settingsXml) {
		return {}
	}

	const settings: AssetTreeSpritesheetFrameData['settings'] = {}

	if (settingsXml.pivotPoint) {
		settings.pivot = {
			x: settingsXml.pivotPoint[0],
			y: settingsXml.pivotPoint[1],
		}
	}

	if (settingsXml.spriteScale) {
		settings.scale = settingsXml.spriteScale
	}

	if (settingsXml.scale9Enabled) {
		settings.nineScale = {
			borders: settingsXml.scale9Borders!,
			paddings: settingsXml.scale9Paddings!,
		}
	}

	return settings
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

								const frames = await extractSpritesheetFrames(
									image.path,
									jsonFilePath,
									texturePackerProject
								)

								const spritesheet: AssetTreeSpritesheetData = addAssetId({
									type: 'spritesheet',
									name: image.name,
									path: image.path,
									image,
									json: addAssetId({
										type: 'json',
										name: jsonFile.name,
										path: jsonFile.path,
									}),
									frames,
									project: texturePackerProject?.path,
								})

								return spritesheet
							})
							.with('bitmap-font', async () => {
								const bitmapFontData = await trpc.readJson.query({ path: jsonFile.path })
								const bitmapFont: AssetTreeBitmapFontData = addAssetId({
									type: 'bitmap-font',
									name: path.basename(fileTreeItem.name, path.extname(fileTreeItem.name)),
									path: path.dirname(fileTreeItem.path),
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
							path: path.dirname(fileTreeItem.path),
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

/**
 * Adds an id to the asset.
 * @note it mutates the asset object
 */
function addAssetId<T extends AssetTreeItemData>(asset: Omit<T, 'id'>): T & { id: string } {
	return Object.assign(asset, { id: getAssetId(asset.type) }) as T & { id: string }
}

function getAssetId(assetType: AssetTreeItemDataType): string {
	return nanoid(10)
}
