export type HierarchyItem =
	| { type: 'container'; name: string; path: string; visible: boolean; children: HierarchyItem[] }
	| { type: 'image'; name: string; path: string; visible: boolean }
	| { type: 'bitmap-text'; name: string; path: string; visible: boolean }
	| { type: 'text'; name: string; path: string; visible: boolean }
