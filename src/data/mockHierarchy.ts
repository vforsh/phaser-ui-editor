import type { HierarchyItem } from '../types/hierarchy'

export const mockHierarchy: HierarchyItem[] = [
	{
		type: 'container',
		name: 'Main Menu',
		path: '/main-menu',
		visible: true,
		children: [
			{
				type: 'container',
				name: 'Header',
				path: '/main-menu/header',
				visible: true,
				children: [
					{
						type: 'image',
						name: 'Background',
						path: '/main-menu/header/background',
						visible: true,
					},
					{
						type: 'image',
						name: 'Logo',
						path: '/main-menu/header/logo',
						visible: true,
					},
					{
						type: 'bitmap-text',
						name: 'Game Title',
						path: '/main-menu/header/title',
						visible: true,
					},
					{
						type: 'bitmap-text',
						name: 'Version',
						path: '/main-menu/header/version',
						visible: false,
					},
				],
			},
			{
				type: 'container',
				name: 'Navigation',
				path: '/main-menu/nav',
				visible: true,
				children: [
					{
						type: 'container',
						name: 'Primary Buttons',
						path: '/main-menu/nav/primary',
						visible: true,
						children: [
							{
								type: 'text',
								name: 'Play',
								path: '/main-menu/nav/primary/play',
								visible: true,
							},
							{
								type: 'text',
								name: 'Continue',
								path: '/main-menu/nav/primary/continue',
								visible: false,
							},
							{
								type: 'text',
								name: 'Settings',
								path: '/main-menu/nav/primary/settings',
								visible: true,
							},
						],
					},
					{
						type: 'container',
						name: 'Secondary Buttons',
						path: '/main-menu/nav/secondary',
						visible: true,
						children: [
							{
								type: 'text',
								name: 'Credits',
								path: '/main-menu/nav/secondary/credits',
								visible: true,
							},
							{
								type: 'text',
								name: 'Quit',
								path: '/main-menu/nav/secondary/quit',
								visible: true,
							},
						],
					},
				],
			},
		],
	},
	{
		type: 'container',
		name: 'HUD',
		path: '/hud',
		visible: true,
		children: [
			{
				type: 'container',
				name: 'Top Bar',
				path: '/hud/top-bar',
				visible: true,
				children: [
					{
						type: 'container',
						name: 'Player Stats',
						path: '/hud/top-bar/stats',
						visible: true,
						children: [
							{
								type: 'image',
								name: 'Health Icon',
								path: '/hud/top-bar/stats/health-icon',
								visible: true,
							},
							{
								type: 'bitmap-text',
								name: 'Health Value',
								path: '/hud/top-bar/stats/health-value',
								visible: true,
							},
							{
								type: 'image',
								name: 'Mana Icon',
								path: '/hud/top-bar/stats/mana-icon',
								visible: true,
							},
							{
								type: 'bitmap-text',
								name: 'Mana Value',
								path: '/hud/top-bar/stats/mana-value',
								visible: true,
							},
						],
					},
					{
						type: 'container',
						name: 'Score',
						path: '/hud/top-bar/score',
						visible: true,
						children: [
							{
								type: 'image',
								name: 'Currency Icon',
								path: '/hud/top-bar/score/currency-icon',
								visible: true,
							},
							{
								type: 'bitmap-text',
								name: 'Currency Value',
								path: '/hud/top-bar/score/currency-value',
								visible: true,
							},
						],
					},
				],
			},
			{
				type: 'container',
				name: 'Minimap',
				path: '/hud/minimap',
				visible: true,
				children: [
					{
						type: 'image',
						name: 'Map Background',
						path: '/hud/minimap/background',
						visible: true,
					},
					{
						type: 'image',
						name: 'Player Marker',
						path: '/hud/minimap/player',
						visible: true,
					},
					{
						type: 'image',
						name: 'Objective Markers',
						path: '/hud/minimap/objectives',
						visible: true,
					},
				],
			},
		],
	},
	{
		type: 'container',
		name: 'Pause Menu',
		path: '/pause',
		visible: false,
		children: [
			{
				type: 'image',
				name: 'Overlay',
				path: '/pause/overlay',
				visible: true,
			},
			{
				type: 'container',
				name: 'Menu Panel',
				path: '/pause/panel',
				visible: true,
				children: [
					{
						type: 'bitmap-text',
						name: 'Title',
						path: '/pause/panel/title',
						visible: true,
					},
					{
						type: 'text',
						name: 'Resume',
						path: '/pause/panel/resume',
						visible: true,
					},
					{
						type: 'text',
						name: 'Settings',
						path: '/pause/panel/settings',
						visible: true,
					},
					{
						type: 'text',
						name: 'Main Menu',
						path: '/pause/panel/main-menu',
						visible: true,
					},
				],
			},
		],
	},
]
