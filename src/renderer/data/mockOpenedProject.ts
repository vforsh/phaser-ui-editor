import { ProjectConfig } from '../project/ProjectConfig'

export const mockOpenedProject = {
	projectDir: '/Users/vlad/dev/papa-cherry-2',
	projectConfig: {
		name: 'Papa Cherry 2',
		slug: 'papa-cherry-2',
		l10n: 'dev/assets/texts.json',
		texturePacker: {
			path: '/Users/vlad/Yandex.Disk.localized/papa-cherry-2/__graphics',
			mapping: {},
		},
		assetsDir: 'dev/assets',
		assetsIgnore: [
			'**/.DS_Store',
			'/audio/**',
			'/configs/**',
			'/fonts/**',
			'/graphics/**/_hashes.json',
			'/graphics/avif/**',
			'/graphics/webp/**',
			'/graphics/png-compressed/**',
			'/graphics/bg_*.*',
			'/graphics/editor.*',
			'/replay.json',
			'/texts.json',
		],
		size: {
			width: 1000,
			height: 750,
		},
	} satisfies ProjectConfig,
	assetsDir: '/Users/vlad/dev/papa-cherry-2/dev/assets',
}
