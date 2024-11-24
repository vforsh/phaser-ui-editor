import { FileItem } from '../types/files'

export const mockFiles: FileItem[] = [
	{
		name: 'UI',
		type: 'folder',
		children: [
			{
				name: 'Components',
				type: 'folder',
				children: [
					{
						name: 'button-states.json',
						type: 'json',
						metadata: {
							size: '2.8 KB',
							modified: '2024-03-20 15:30',
						},
					},
					{
						name: 'dialog-layouts.json',
						type: 'json',
						metadata: {
							size: '4.3 KB',
							modified: '2024-03-19 11:45',
						},
					},
					{
						name: 'menu-templates.json',
						type: 'json',
						metadata: {
							size: '3.8 KB',
							modified: '2024-03-18 09:15',
						},
					},
				],
			},
			{
				name: 'Themes',
				type: 'folder',
				children: [
					{
						name: 'dark-theme.json',
						type: 'json',
						metadata: {
							size: '5.2 KB',
							modified: '2024-03-20 16:45',
						},
					},
					{
						name: 'light-theme.json',
						type: 'json',
						metadata: {
							size: '4.9 KB',
							modified: '2024-03-20 16:45',
						},
					},
				],
			},
		],
	},
	{
		name: 'Assets',
		type: 'folder',
		children: [
			{
				name: 'Backgrounds',
				type: 'folder',
				children: [
					{
						name: 'main-menu-bg.jpg',
						type: 'image',
						metadata: {
							dimensions: { width: 1920, height: 1080 },
							size: '2.4 MB',
							modified: '2024-03-20 16:45',
							url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
						},
					},
					{
						name: 'game-over-bg.jpg',
						type: 'image',
						metadata: {
							dimensions: { width: 1920, height: 1080 },
							size: '1.8 MB',
							modified: '2024-03-20 14:20',
							url: 'https://images.unsplash.com/photo-1590510616176-67c87a688154',
						},
					},
				],
			},
			{
				name: 'Icons',
				type: 'folder',
				children: [
					{
						name: 'currency.png',
						type: 'image',
						metadata: {
							dimensions: { width: 64, height: 64 },
							size: '12 KB',
							modified: '2024-03-19 10:30',
							url: 'https://images.unsplash.com/photo-1633409361618-c73427e4e206',
						},
					},
					{
						name: 'health.png',
						type: 'image',
						metadata: {
							dimensions: { width: 64, height: 64 },
							size: '14 KB',
							modified: '2024-03-18 13:25',
							url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa',
						},
					},
					{
						name: 'mana.png',
						type: 'image',
						metadata: {
							dimensions: { width: 64, height: 64 },
							size: '11 KB',
							modified: '2024-03-17 09:10',
							url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
						},
					},
				],
			},
			{
				name: 'Characters',
				type: 'folder',
				children: [
					{
						name: 'hero-portrait.png',
						type: 'image',
						metadata: {
							dimensions: { width: 512, height: 512 },
							size: '856 KB',
							modified: '2024-03-20 11:15',
							url: 'https://images.unsplash.com/photo-1544511916-0148ccdeb877',
						},
					},
					{
						name: 'npc-portraits.png',
						type: 'image',
						metadata: {
							dimensions: { width: 1024, height: 256 },
							size: '1.2 MB',
							modified: '2024-03-19 14:30',
							url: 'https://images.unsplash.com/photo-1596075780750-81249df16d19',
						},
					},
				],
			},
		],
	},
	{
		name: 'Config',
		type: 'folder',
		children: [
			{
				name: 'game-settings.json',
				type: 'json',
				metadata: {
					size: '1.2 KB',
					modified: '2024-03-20 17:00',
				},
			},
			{
				name: 'ui-layouts.json',
				type: 'json',
				metadata: {
					size: '2.8 KB',
					modified: '2024-03-19 16:15',
				},
			},
			{
				name: 'animations.json',
				type: 'json',
				metadata: {
					size: '5.6 KB',
					modified: '2024-03-18 14:40',
				},
			},
		],
	},
]
