export interface FileItem {
	name: string
	type: 'folder' | 'json' | 'image'
	children?: FileItem[]
	isOpen?: boolean
	metadata?: {
		dimensions?: { width: number; height: number }
		size?: string
		modified?: string
		url?: string
	}
}
